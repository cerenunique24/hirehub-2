-- Ücretsiz deneme süresi 7 günden 3 güne. Tek kaynak: start_plan_trial.
-- Mevcut fonksiyon gövdesi aynen korunur, yalnızca deneme aralığı değişir.
-- Mevcut trial kayıtları (expires_at) değiştirilmez; yalnızca yeni denemeleri etkiler.
do $t$
declare src text;
begin
  select pg_get_functiondef('public.start_plan_trial(text,text)'::regprocedure) into src;
  execute replace(src, 'interval ''7 days''', 'interval ''3 days''');
end
$t$;
