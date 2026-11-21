"use client";

import Link from "next/link";
import {Bell, Shield, LockKeyhole, UserRound, CreditCard, ArrowRight, LogOut, Loader2} from "lucide-react";
import {Button, buttonClasses} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PremiumVisibilityManager from "@/components/premium/PremiumVisibilityManager";
import AccountDeletionCard from "./AccountDeletionCard";
import type {Profile, Tab} from "./AccountSettings";
import type {SubscriptionStatus} from "@/lib/premium";
import styles from "./ClientSettings.module.css";

export const CLIENT_SETTINGS_SECTIONS = [
  {id:"hesap", label:"Hesap", description:"Hesap ve iletişim bilgileri", icon:UserRound},
  {id:"bildirimler", label:"Bildirimler", description:"Kayıtlı bildirim tercihleri", icon:Bell},
  {id:"guvenlik", label:"Güvenlik", description:"Şifre yönetimi", icon:LockKeyhole},
  {id:"gizlilik", label:"Gizlilik ve hesap", description:"Görünürlük ve hesap izinleri", icon:Shield},
  {id:"uyelik", label:"Üyelik", description:"Plan ve görünürlük hakları", icon:CreditCard},
] as const;

const NOTIFICATION_GROUPS = [
  {title:"Bildirim kanalları", items:[
    {key:"email", label:"E-posta bildirimleri", description:"E-posta kanalı için kayıtlı tercihiniz."},
    {key:"platform", label:"Uygulama bildirimleri", description:"Uygulama içi bildirimler için kayıtlı tercihiniz."},
  ]},
  {title:"Projeler ve teklifler", items:[
    {key:"projects", label:"Proje güncellemeleri", description:"Proje durumundaki gelişmelere ilişkin tercihiniz."},
    {key:"proposals", label:"Teklif ve davetler", description:"Teklif ve davet güncellemelerine ilişkin tercihiniz."},
  ]},
  {title:"İletişim", items:[
    {key:"messages", label:"Yeni mesajlar", description:"Mesaj bildirimleri için kayıtlı tercihiniz."},
    {key:"marketing", label:"Ürün ve kampanya duyuruları", description:"Yeni özellik ve kampanya bildirimlerine ilişkin tercihiniz."},
  ]},
];

type Props = {
  tab:Tab; onTabChange:(tab:Tab)=>void; profileHref:string; profile:Profile|null; email:string;
  phone:string; onPhoneChange:(value:string)=>void; onSavePhone:()=>void;
  savingField:string|null; saveMessage:string; saveError:string;
  loading:boolean; loadError:string; onRetry:()=>void;
  newPassword:string; confirmPassword:string; onNewPasswordChange:(value:string)=>void; onConfirmPasswordChange:(value:string)=>void;
  passwordSaving:boolean; passwordError:string; passwordSuccess:string; onPasswordSave:()=>void;
  subscription:SubscriptionStatus|null; subscriptionLoading:boolean; onManagePlan:()=>void; onLogout:()=>void;
  onPersist:(patch:Partial<Profile>,key:string)=>void;
};

function SettingSwitch({id,label,description,checked,busy,disabled,onChange}:{id:string;label:string;description:string;checked:boolean;busy:boolean;disabled:boolean;onChange:()=>void}) {
  return <div className={styles.preferenceRow}>
    <div><p id={id+"-label"} className={styles.rowLabel}>{label}</p><p id={id+"-help"} className={styles.helper}>{description}</p></div>
    <div className={styles.switchControl}>{busy && <Loader2 size={14} aria-label="Kaydediliyor" className="animate-spin"/>}<span className={styles.switchState}>{checked?"Açık":"Kapalı"}</span>
      <button type="button" id={id} role="switch" aria-checked={checked} aria-labelledby={id+"-label"} aria-describedby={id+"-help"} disabled={disabled} onClick={onChange} className={styles.switchButton}>
        <span className={styles.switchTrack} data-checked={checked}><span/></span>
      </button>
    </div>
  </div>;
}

export function ClientSettingsView(props:Props) {
  const {tab,onTabChange,profile,profileHref,email,phone,onPhoneChange,onSavePhone,savingField,saveMessage,saveError,loading,loadError,onRetry,newPassword,confirmPassword,onNewPasswordChange,onConfirmPasswordChange,passwordSaving,passwordError,passwordSuccess,onPasswordSave,subscription,subscriptionLoading,onManagePlan,onLogout,onPersist}=props;
  const pending=savingField!==null;
  const phoneChanged=phone!==(profile?.phone??"");
  const current=CLIENT_SETTINGS_SECTIONS.find(section=>section.id===tab)??CLIENT_SETTINGS_SECTIONS[0];
  function navigate(event:React.KeyboardEvent<HTMLButtonElement>,index:number) {
    const next=event.key==="ArrowDown"?(index+1)%CLIENT_SETTINGS_SECTIONS.length:event.key==="ArrowUp"?(index-1+CLIENT_SETTINGS_SECTIONS.length)%CLIENT_SETTINGS_SECTIONS.length:event.key==="Home"?0:event.key==="End"?CLIENT_SETTINGS_SECTIONS.length-1:-1;
    if(next<0)return;event.preventDefault();onTabChange(CLIENT_SETTINGS_SECTIONS[next].id);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
  return <div className={styles.layout}>
    <div className={styles.navigation}>
      <nav role="tablist" aria-label="Ayar kategorileri" aria-orientation="vertical" className={styles.desktopNav}>
        {CLIENT_SETTINGS_SECTIONS.map((section,index)=>{const Icon=section.icon;return <button type="button" role="tab" id={"client-settings-tab-"+section.id} aria-controls="client-settings-panel" aria-selected={tab===section.id} tabIndex={tab===section.id?0:-1} key={section.id} onClick={()=>onTabChange(section.id)} onKeyDown={event=>navigate(event,index)}><Icon size={18} strokeWidth={1.75}/><span><strong>{section.label}</strong><span>{section.description}</span></span></button>;})}
      </nav>
      <div className={styles.mobileNav}><label htmlFor="client-settings-category">Ayar kategorisi</label><Select id="client-settings-category" aria-controls="client-settings-panel" options={CLIENT_SETTINGS_SECTIONS.map(section=>({value:section.id,label:section.label}))} value={current.id} onChange={event=>onTabChange(event.target.value as Tab)}/></div>
    </div>
    <div id="client-settings-panel" role="tabpanel" aria-labelledby={"client-settings-tab-"+current.id} aria-busy={loading} className={styles.content}>
      {loading?<div role="status" className={styles.state}><Loader2 size={18} className="animate-spin"/>Ayarlar yükleniyor…</div>:loadError?<div role="alert" className={styles.stateError}><h2>Ayarlar yüklenemedi</h2><p>{loadError}</p><Button variant="secondary" onClick={onRetry}>Tekrar dene</Button></div>:<>
      {tab==="hesap" && <section>
        <header className={styles.contentHeading}><h2>Hesap bilgileri</h2><p>Hesabınıza bağlı bilgileri görüntüleyin ve iletişim numaranızı güncelleyin.</p></header>
        <dl className={styles.accountFacts}><div><dt>Ad soyad</dt><dd>{[profile?.first_name,profile?.last_name].filter(Boolean).join(" ")||"Belirtilmedi"}</dd></div><div><dt>E-posta adresi</dt><dd>{email||"Belirtilmedi"}</dd></div></dl>
        <section className={styles.section}><h3>İletişim bilgileri</h3><p className={styles.sectionDescription}>Hesabınızla ilişkili telefon numarası.</p>
          <form onSubmit={event=>{event.preventDefault();if(phoneChanged&&!pending)onSavePhone();}} className={`${styles.form} ${styles.contactForm}`}>
            <div className={styles.field}><label htmlFor="client-settings-phone">Telefon numarası</label><Input id="client-settings-phone" type="tel" autoComplete="tel" value={phone} onChange={event=>onPhoneChange(event.target.value)} placeholder="+90 5xx xxx xx xx" aria-describedby="client-settings-phone-help" disabled={pending}/><p id="client-settings-phone-help" className={styles.helper}>Ülke koduyla birlikte girin.</p></div>
            <div className={styles.formActions}>{phoneChanged&&<p>Kaydedilmemiş değişiklikler var.</p>}<Button type="submit" disabled={!phoneChanged||pending} loading={savingField==="phone"}>{savingField==="phone"?"Kaydediliyor":"Değişiklikleri kaydet"}</Button></div>
          </form>
        </section>
        <section className={styles.section}><h3>Profil bilgileri</h3><p className={styles.sectionDescription}>Profil fotoğrafınızı, şirket bilgilerinizi ve profil açıklamanızı profil sayfanızdan düzenleyebilirsiniz.</p><Link href={profileHref} className={buttonClasses({variant:"secondary",className:styles.profileLink})}>Profili düzenle<ArrowRight size={15}/></Link></section>
      </section>}
      {tab==="bildirimler" && <section><header className={styles.contentHeading}><h2>Bildirimler</h2><p>Kayıtlı bildirim tercihlerinizi yönetin.</p></header>
        {NOTIFICATION_GROUPS.map(group=><section key={group.title} className={styles.notificationGroup}><h3>{group.title}</h3>{group.items.map(item=>{const enabled=profile?.notification_preferences?.[item.key]!==false;return <SettingSwitch key={item.key} id={"client-notification-"+item.key} label={item.label} description={item.description} checked={enabled} busy={savingField===item.key} disabled={pending} onChange={()=>onPersist({notification_preferences:{...profile?.notification_preferences,[item.key]:!enabled}},item.key)}/>;})}</section>)}
      </section>}
      {tab==="guvenlik" && <section><header className={styles.contentHeading}><h2>Güvenlik</h2><p>Hesabınızın şifresini yönetin.</p></header>
        <section className={styles.section}><h3>Şifre değişikliği</h3><p className={styles.sectionDescription}>Yeni şifrenizi iki alana da girin.</p>
          <form className={styles.form} onSubmit={event=>{event.preventDefault();if(!passwordSaving)onPasswordSave();}}>
            <div className={styles.fields}><div className={styles.field}><label htmlFor="client-new-password">Yeni şifre</label><Input id="client-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={event=>onNewPasswordChange(event.target.value)} disabled={passwordSaving} aria-describedby={passwordError?"client-password-help client-password-error":"client-password-help"} hasError={Boolean(passwordError)} aria-invalid={Boolean(passwordError)}/></div><div className={styles.field}><label htmlFor="client-confirm-password">Yeni şifre (tekrar)</label><Input id="client-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={event=>onConfirmPasswordChange(event.target.value)} disabled={passwordSaving} aria-invalid={Boolean(passwordError)} aria-describedby={passwordError?"client-password-error":undefined}/></div></div>
            <p id="client-password-help" className={styles.helper}>Şifre en az 6 karakter olmalıdır.</p>
            {passwordError&&<p role="alert" id="client-password-error" className={styles.error}>{passwordError}</p>}{passwordSuccess&&<p role="status" className={styles.success}>{passwordSuccess}</p>}
            <div className={styles.formActions}><Button type="submit" loading={passwordSaving} disabled={passwordSaving||!newPassword||!confirmPassword}>{passwordSaving?"Kaydediliyor":"Şifreyi güncelle"}</Button></div>
          </form>
        </section>
      </section>}
      {tab==="gizlilik" && <section><header className={styles.contentHeading}><h2>Gizlilik ve hesap</h2><p>Profil görünürlüğünüzü, iletişim izninizi ve hesap işlemlerinizi yönetin.</p></header>
        <section className={styles.section}><h3>Profil görünürlüğü</h3><fieldset className={styles.visibility}><legend className="sr-only">Profilinizi kimler görebilir?</legend>{[{value:"public" as const,label:"Herkese açık",description:"Profiliniz arama ve keşifte görünür."},{value:"private" as const,label:"Sadece ilgili taraflar",description:"Birlikte çalıştığınız kullanıcılarla sınırlı görünürlük."}].map(option=><label key={option.value}><input type="radio" name="client-profile-visibility" value={option.value} checked={profile?.profile_visibility===option.value} disabled={pending} onChange={()=>onPersist({profile_visibility:option.value},"visibility")}/><span><strong>{option.label}</strong><span>{option.description}</span></span></label>)}</fieldset></section>
        <section className={styles.section}><h3>İletişim izni</h3><SettingSwitch id="client-marketing-consent" label="Pazarlama ve kampanya iletişimi" description="Bu izin, hesap ve sözleşme onaylarından bağımsızdır." checked={Boolean(profile?.marketing_consent)} busy={savingField==="marketing_consent"} disabled={pending} onChange={()=>onPersist({marketing_consent:!profile?.marketing_consent},"marketing_consent")}/></section>
        <section className={styles.section}><h3>Oturum</h3><p className={styles.sectionDescription}>Bu hesaptaki mevcut oturumunuzu sonlandırın.</p><Button className={styles.profileLink} variant="secondary" onClick={onLogout}><LogOut size={16}/>Çıkış yap</Button></section>
        <section className={`${styles.section} ${styles.dangerZone}`}><AccountDeletionCard settingsPresentation/></section>
      </section>}
      {tab==="uyelik" && <section className={styles.membership}><header className={styles.contentHeading}><h2>Üyelik</h2><p>Mevcut planınızı ve öne çıkarma haklarınızı yönetin.</p></header>
        <section className={styles.section}><h3>Mevcut plan</h3>{subscriptionLoading?<p role="status" className={styles.sectionDescription}>Üyelik bilgileri yükleniyor…</p>:subscription?<><p className={styles.planName}>{subscription.plan==="pro"?"Pro":subscription.plan==="plus"?"Plus":"Free"}</p>{subscription.status==="trial"&&<p className={styles.helper}>Deneme üyeliği</p>}{subscription.expires_at&&Number.isFinite(Date.parse(subscription.expires_at))&&<p className={styles.helper}>Geçerlilik: {new Date(subscription.expires_at).toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"})}</p>}</>:<p className={styles.sectionDescription}>Üyelik bilgisi şu anda görüntülenemiyor. Plan yönetiminden tekrar kontrol edebilirsiniz.</p>}<Button className={styles.profileLink} variant="secondary" onClick={onManagePlan}>Planı yönet<ArrowRight size={15}/></Button></section>
        <PremiumVisibilityManager/>
      </section>}
      {saveError&&<p role="alert" className={styles.feedbackError}>{saveError}</p>}{saveMessage&&<p role="status" className={styles.feedbackSuccess}>{saveMessage}</p>}
      </>}
    </div>
  </div>;
}
