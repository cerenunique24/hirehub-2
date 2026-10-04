-- P1: "Pazarlama/kampanya iletişimi" onayı şu ana kadar hiç yoktu — terms/
-- KVKK onayından AYRI, opsiyonel bir tercih olarak eklenir (hukuki metinler
-- bu görevin kapsamı dışında; burada sadece teknik altyapı hazırlanır).
--
-- user_consents (kvkk/terms) append-only bir KABUL GEÇMİŞİdir — "kabul
-- edildi" kaydı bir daha geri alınmaz, bu doğru bir model (sözleşmeyi
-- kabul ettin, bu değişmez bir gerçek). Pazarlama onayı ise AÇILIP
-- KAPATILABİLEN bir TERCİHtir, geçmiş kaydı değil — bu yüzden ayrı,
-- toggle edilebilir bir alan olarak profiles'a eklenir; aynı checkbox'ı
-- veya aynı tabloyu terms/KVKK ile paylaşmaz.
alter table public.profiles
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists marketing_consent_updated_at timestamptz;

grant update (marketing_consent, marketing_consent_updated_at) on public.profiles to authenticated;
grant select (marketing_consent, marketing_consent_updated_at) on public.profiles to authenticated;

create or replace function private.stamp_marketing_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.marketing_consent is distinct from old.marketing_consent then
    new.marketing_consent_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_stamp_marketing_consent on public.profiles;
create trigger profiles_stamp_marketing_consent
  before update on public.profiles
  for each row execute function private.stamp_marketing_consent();

-- Kayıt formundan gelen ilk tercih (opsiyonel, varsayılan kapalı).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    role,
    email,
    account_type,
    company_name,
    marketing_consent,
    marketing_consent_updated_at
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'role',
    new.email,
    new.raw_user_meta_data ->> 'account_type',
    new.raw_user_meta_data ->> 'company_name',
    coalesce((new.raw_user_meta_data ->> 'consent_marketing')::boolean, false),
    case
      when new.raw_user_meta_data ? 'consent_marketing' then now()
      else null
    end
  );

  return new;
end;
$$;
