"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


export default function CompanySetupPage() {

  const router = useRouter();


  const [logo, setLogo] = useState<File | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [sector, setSector] = useState("");
  const [city, setCity] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");

  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  const [personName, setPersonName] = useState("");
  const [position, setPosition] = useState("");
  const [contactEmail, setContactEmail] = useState("");



  const isValid =
    logo &&
    companyName &&
    companyType &&
    sector &&
    city &&
    employeeCount &&
    description &&
    personName &&
    position &&
    contactEmail;



  function completeProfile(){

    if(!isValid) return;


    localStorage.setItem(
      "accountType",
      "company"
    );


    router.push(
      "/client/dashboard"
    );

  }




return (

<main
className="
min-h-screen
bg-[var(--color-canvas)]
flex
items-center
justify-center
px-6
py-12
"
>


<div
className="
bg-white
max-w-3xl
w-full
rounded-xl
p-10
shadow-sm
"
>


<h1
className="
text-3xl
font-semibold
"
>
Şirket Profilini Oluştur
</h1>


<p
className="
text-gray-500
mt-3
"
>
Şirket bilgilerinizi tamamlayarak freelancerlarla çalışmaya başlayın.
</p>




<div
className="
mt-10
space-y-7
"
>





{/* LOGO */}


<div>


<label
className="
font-medium
"
>
Şirket Logosu
</label>


<label

className="
mt-3
w-32
h-32
rounded-2xl
border
border-dashed
flex
items-center
justify-center
cursor-pointer
overflow-hidden
text-gray-400
hover:border-[var(--color-primary-600)]
transition
"

>


{
logo ? (

<img

src={URL.createObjectURL(logo)}

className="
w-full
h-full
object-cover
"

/>

)

:

(

<span>
Logo Ekle
</span>

)

}



<input

type="file"

accept="image/*"

className="hidden"

onChange={(e)=>{

if(e.target.files?.[0]){

setLogo(
e.target.files[0]
);

}

}}

/>


</label>


</div>







{/* COMPANY NAME */}


<div>

<label className="font-medium">
Şirket Adı
</label>


<input

value={companyName}

onChange={(e)=>setCompanyName(e.target.value)}

placeholder="Örn. ABC Teknoloji"

className="
w-full
mt-2
border
rounded-xl
px-4
py-3
"

/>


</div>







{/* TYPE + SECTOR */}


<div
className="
grid
md:grid-cols-2
gap-5
"
>


<div>

<label className="font-medium">
Şirket Türü
</label>


<select

value={companyType}

onChange={(e)=>setCompanyType(e.target.value)}

className="
w-full
mt-2
border
rounded-xl
px-4
py-3
"

>

<option value="">
Seçiniz
</option>

<option>
Anonim Şirket
</option>

<option>
Limited Şirket
</option>

<option>
Şahıs Şirketi
</option>

<option>
Diğer
</option>

</select>


</div>





<div>

<label className="font-medium">
Sektör
</label>


<select

value={sector}

onChange={(e)=>setSector(e.target.value)}

className="
w-full
mt-2
border
rounded-xl
px-4
py-3
"

>

<option value="">
Seçiniz
</option>

<option>
Teknoloji
</option>

<option>
E-Ticaret
</option>

<option>
Tasarım
</option>

<option>
İnşaat
</option>

<option>
Finans
</option>

<option>
Sağlık
</option>

</select>


</div>



</div>







{/* CITY + EMPLOYEE */}


<div
className="
grid
md:grid-cols-2
gap-5
"
>


<div>

<label className="font-medium">
Şehir
</label>


<input

value={city}

onChange={(e)=>setCity(e.target.value)}

placeholder="İstanbul"

className="
w-full
mt-2
border
rounded-xl
px-4
py-3
"

/>


</div>





<div>

<label className="font-medium">
Çalışan Sayısı
</label>


<select

value={employeeCount}

onChange={(e)=>setEmployeeCount(e.target.value)}

className="
w-full
mt-2
border
rounded-xl
px-4
py-3
"

>

<option value="">
Seçiniz
</option>

<option>
1-10
</option>

<option>
11-50
</option>

<option>
51-250
</option>

<option>
250+
</option>


</select>


</div>


</div>







{/* WEBSITE */}


<div>

<label className="font-medium">
Web Sitesi (Opsiyonel)
</label>


<input

value={website}

onChange={(e)=>setWebsite(e.target.value)}

placeholder="https://"

className="
w-full
mt-2
border
rounded-xl
px-4
py-3
"

/>


</div>







{/* DESCRIPTION */}


<div>

<label className="font-medium">
Şirket Açıklaması
</label>


<textarea

value={description}

onChange={(e)=>setDescription(e.target.value)}

rows={5}

placeholder="Şirketinizi kısaca anlatın..."

className="
w-full
mt-2
border
rounded-xl
px-4
py-3
resize-none
"

/>


</div>








{/* CONTACT */}


<div
className="
grid
md:grid-cols-3
gap-5
"
>


<div>

<label className="font-medium">
Yetkili Kişi
</label>


<input

value={personName}

onChange={(e)=>setPersonName(e.target.value)}

placeholder="Ad Soyad"

className="
w-full
mt-2
border
rounded-xl
px-4
py-3
"

/>


</div>





<div>

<label className="font-medium">
Pozisyon
</label>


<input

value={position}

onChange={(e)=>setPosition(e.target.value)}

placeholder="Kurucu, Yönetici"

className="
w-full
mt-2
border
rounded-xl
px-4
py-3
"

/>


</div>





<div>

<label className="font-medium">
Yetkili Mail
</label>


<input

type="email"

value={contactEmail}

onChange={(e)=>setContactEmail(e.target.value)}

placeholder="mail@sirket.com"

className="
w-full
mt-2
border
rounded-xl
px-4
py-3
"

/>


</div>



</div>






<button

disabled={!isValid}

onClick={completeProfile}

className={`
w-full
py-4
rounded-xl
font-semibold
mt-8

${
isValid
?
"bg-[var(--color-primary-600)] text-white"
:
"bg-gray-300 text-gray-500 cursor-not-allowed"
}

`}

>

Profili Tamamla

</button>





</div>


</div>


</main>


);

}