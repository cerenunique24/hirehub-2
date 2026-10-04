-- 202609300006 bir sütun-seviyesi REVOKE denedi, ama `projects` tablosunda
-- `authenticated`/`anon`'a zaten TABLO seviyesinde (tüm sütunlar) SELECT
-- verilmişti — Postgres'te sütun seviyesi REVOKE, o sütunu kapsayan daha
-- geniş bir tablo seviyesi GRANT'i ASLA geçersiz kılmaz. Bu yüzden önceki
-- revoke hiçbir şey değiştirmedi (doğrulandı: unrelated bir kullanıcı hâlâ
-- `select budget_breakdown from projects` çalıştırabiliyordu).
--
-- Doğru yol: tablo seviyesi SELECT'i tamamen geri al, sonra `budget_breakdown`
-- DIŞINDAKİ tüm sütunlara AÇIKÇA select izni ver. Mevcut RLS politikası
-- (satır görünürlüğü) tamamen aynı kalır — bu sadece hangi SÜTUNLARIN
-- görünür olduğunu değiştirir.
revoke select on public.projects from authenticated, anon;

grant select (
  id, client_id, title, description, budget, location, project_type, skills,
  status, deadline, created_at, updated_at, category, experience_level,
  budget_min, budget_max, estimated_days_min, estimated_days_max,
  team_required, team_size, collaboration_type, timezone, deliverables,
  requirements, application_deadline, country, city, estimated_duration,
  commission_rate, requirements_confirmed_at, requirements_note
) on public.projects to authenticated, anon;
