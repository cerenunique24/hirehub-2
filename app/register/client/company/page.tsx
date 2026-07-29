"use client";

import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { useRouter } from "next/navigation";


export default function CompanyRegisterPage() {


  const router = useRouter();


  const [showPassword,setShowPassword] = useState(false);
  const [showConfirm,setShowConfirm] = useState(false);



  const [form,setForm] = useState({

    companyName:"",
    sector:"",
    website:"",
    firstName:"",
    lastName:"",
    email:"",
    phone:"",
    password:"",
    confirmPassword:"",

  });



  const rules = [

    {
      text:"En az 8 karakter",
      valid: form.password.length >= 8
    },

    {
      text:"En az 1 büyük harf",
      valid:/[A-Z]/.test(form.password)
    },

    {
      text:"En az 1 küçük harf",
      valid:/[a-z]/.test(form.password)
    },

    {
      text:"En az 1 rakam",
      valid:/[0-9]/.test(form.password)
    },

  ];



  const passwordValid =
    rules.every(
      item=>item.valid
    );




  function update(
    e:React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ){

    setForm({

      ...form,

      [e.target.name]:e.target.value

    });

  }





  function submit(e:React.FormEvent){

    e.preventDefault();


    if(
      !form.companyName ||
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.password ||
      !form.confirmPassword
    ){

      return;

    }



    if(!passwordValid){

      return;

    }



    if(
      form.password !== form.confirmPassword
    ){

      return;

    }



    router.push(
      "/register/client/verify"
    );


  }







return (

<main
className="
min-h-screen
bg-[#F7F8FA]
flex
items-center
justify-center
px-6
py-12
"
>


<div
className="
w-full
max-w-xl
bg-white
rounded-3xl
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
Kurumsal Hesap Oluştur
</h1>


<p
className="
mt-2
text-gray-500
"
>
Şirket hesabını oluştur ve profesyonel projeler yayınlamaya başla.
</p>





<form
onSubmit={submit}
className="
mt-8
space-y-5
"
>




<h2
className="
font-semibold
text-lg
"
>
Yetkili Kişi
</h2>



<div
className="
grid
grid-cols-2
gap-4
"
>


<input

name="firstName"

placeholder="Ad"

value={form.firstName}

onChange={update}

className="
h-12
border
rounded-xl
px-4
outline-none
focus:border-black
"

/>


<input

name="lastName"

placeholder="Soyad"

value={form.lastName}

onChange={update}

className="
h-12
border
rounded-xl
px-4
outline-none
focus:border-black
"

/>



</div>





<input

name="email"

type="email"

placeholder="Kurumsal E-posta"

value={form.email}

onChange={update}

className="
w-full
h-12
border
rounded-xl
px-4
outline-none
focus:border-black
"

/>




<input

name="phone"

placeholder="Telefon"

value={form.phone}

onChange={update}

className="
w-full
h-12
border
rounded-xl
px-4
outline-none
focus:border-black
"

/>






<h2
className="
font-semibold
text-lg
pt-5
"
>
Şirket Bilgileri
</h2>




<input

name="companyName"

placeholder="Şirket Adı"

value={form.companyName}

onChange={update}

className="
w-full
h-12
border
rounded-xl
px-4
outline-none
focus:border-black
"

/>




<select

name="sector"

value={form.sector}

onChange={update}

className="
w-full
h-12
border
rounded-xl
px-4
outline-none
"
>

<option value="">
Sektör Seç
</option>

<option>
Yazılım
</option>

<option>
Tasarım
</option>

<option>
E-ticaret
</option>

<option>
İnşaat
</option>

<option>
Diğer
</option>


</select>





<input

name="website"

placeholder="Web Sitesi (Opsiyonel)"

value={form.website}

onChange={update}

className="
w-full
h-12
border
rounded-xl
px-4
outline-none
focus:border-black
"

/>








<h2
className="
font-semibold
text-lg
pt-5
"
>
Hesap Güvenliği
</h2>




<div className="relative">


<input

name="password"

type={
showPassword
?
"text"
:
"password"
}

placeholder="Şifre"

value={form.password}

onChange={update}

className="
w-full
h-12
border
rounded-xl
px-4
pr-12
outline-none
focus:border-black
"

/>


<button

type="button"

onClick={()=>
setShowPassword(!showPassword)
}

className="
absolute
right-4
top-3.5
text-gray-400
"
>

{
showPassword
?
<EyeOff size={18}/>
:
<Eye size={18}/>
}

</button>


</div>





<div
className="
bg-gray-50
rounded-xl
p-4
space-y-2
"
>


{
rules.map(rule=>(


<div

key={rule.text}

className="
flex
items-center
gap-2
text-sm
"
>


<div
className={`
w-5
h-5
rounded-full
flex
items-center
justify-center
${
rule.valid
?
"bg-green-500 text-white"
:
"bg-gray-200 text-gray-400"
}
`}
>

<Check size={12}/>

</div>


{rule.text}


</div>


))
}



</div>






<div className="relative">


<input

name="confirmPassword"

type={
showConfirm
?
"text"
:
"password"
}

placeholder="Şifre Tekrar"

value={form.confirmPassword}

onChange={update}

className="
w-full
h-12
border
rounded-xl
px-4
pr-12
outline-none
focus:border-black
"

/>


<button

type="button"

onClick={()=>
setShowConfirm(!showConfirm)
}

className="
absolute
right-4
top-3.5
text-gray-400
"
>

{
showConfirm
?
<EyeOff size={18}/>
:
<Eye size={18}/>
}


</button>


</div>






<button

type="submit"

className="
w-full
h-12
rounded-xl
bg-black
text-white
font-medium
hover:bg-gray-800
transition
"

>

Kayıt Oluştur

</button>




</form>



</div>


</main>

);

}