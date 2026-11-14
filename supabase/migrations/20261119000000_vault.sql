-- T: shared credentials vault (zero-knowledge).
-- Encryption happens in the browser (src/features/vault/crypto.ts). These
-- tables only hold base64 salt, IVs and AES-GCM ciphertexts; the vault
-- passphrase and plaintext secrets never reach the database.

-- Vault metadata: single row with the KDF parameters and the verifier ------

create table public.vault_meta (
  id smallint primary key default 1 check (id = 1),
  salt text not null,
  kdf_iterations integer not null check (kdf_iterations >= 100000),
  verifier_iv text not null,
  verifier_ciphertext text not null,
  updated_by text not null default lower(auth.jwt() ->> 'email'),
  updated_at timestamptz not null default now()
);

alter table public.vault_meta enable row level security;

revoke all on public.vault_meta from anon;
-- Meta changes only through public.rotate_vault() (security definer).
revoke update, delete on public.vault_meta from authenticated;

create policy "vault_meta_select_for_members"
  on public.vault_meta for select to authenticated
  using ((select public.is_member()));

-- First member creates the vault; the id = 1 check keeps it a single row.
create policy "vault_meta_insert_for_members"
  on public.vault_meta for insert to authenticated
  with check ((select public.is_member()));

-- Vault items ----------------------------------------------------------------
-- `id` has no default: the client generates it so it can be used as the AES-GCM
-- AAD ("vault-item:<id>") before the row is inserted. Ciphertext holds the JSON
-- payload { username, password, url, notes }.

create table public.vault_items (
  id uuid primary key,
  label text not null check (char_length(label) between 1 and 120),
  category text,
  iv text not null,
  ciphertext text not null,
  created_by text not null default lower(auth.jwt() ->> 'email'),
  updated_by text not null default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vault_items_set_updated_at
  before update on public.vault_items
  for each row
  execute function public.set_updated_at();

alter table public.vault_items enable row level security;

revoke all on public.vault_items from anon;

create policy "vault_items_select_for_members"
  on public.vault_items for select to authenticated
  using ((select public.is_member()));

create policy "vault_items_insert_for_members"
  on public.vault_items for insert to authenticated
  with check ((select public.is_member()));

create policy "vault_items_update_for_members"
  on public.vault_items for update to authenticated
  using ((select public.is_member()))
  with check ((select public.is_member()));

create policy "vault_items_delete_for_members"
  on public.vault_items for delete to authenticated
  using ((select public.is_member()));

-- Passphrase change ----------------------------------------------------------
-- The client re-encrypts the verifier and every item under a new key, then
-- calls this function so the whole switch happens in one transaction.
-- p_items: [{ "id": "<uuid>", "iv": "<b64>", "ciphertext": "<b64>" }, ...]
-- It must cover exactly the current items: no item may be lost or added,
-- otherwise some rows would stay encrypted under the old key.

create or replace function public.rotate_vault(
  p_salt text,
  p_iterations int,
  p_verifier_iv text,
  p_verifier_ciphertext text,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_count int;
begin
  if not public.is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'invalid items' using errcode = '22023';
  end if;

  -- Block concurrent item writes and rotations until this transaction ends.
  lock table public.vault_meta, public.vault_items in exclusive mode;

  if not exists (select 1 from public.vault_meta where id = 1) then
    raise exception 'vault not initialized' using errcode = 'P0002';
  end if;

  -- Same id set: no duplicates, no unknown ids, no missing ids.
  select count(*) into v_count from jsonb_array_elements(p_items);
  if v_count <> (select count(distinct (e ->> 'id')) from jsonb_array_elements(p_items) e)
    or v_count <> (select count(*) from public.vault_items)
    or exists (
      select 1 from jsonb_array_elements(p_items) e
      where not exists (
        select 1 from public.vault_items i where i.id::text = (e ->> 'id')
      )
    )
  then
    raise exception 'vault items changed, reload and retry' using errcode = '40001';
  end if;

  update public.vault_meta
  set salt = p_salt,
      kdf_iterations = p_iterations,
      verifier_iv = p_verifier_iv,
      verifier_ciphertext = p_verifier_ciphertext,
      updated_by = v_email,
      updated_at = now()
  where id = 1;

  update public.vault_items i
  set iv = e ->> 'iv',
      ciphertext = e ->> 'ciphertext',
      updated_by = v_email
  from jsonb_array_elements(p_items) e
  where i.id::text = (e ->> 'id');
end;
$$;

revoke execute on function public.rotate_vault(text, int, text, text, jsonb) from public, anon;
grant execute on function public.rotate_vault(text, int, text, text, jsonb) to authenticated;
