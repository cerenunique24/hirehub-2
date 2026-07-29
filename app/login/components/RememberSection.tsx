"use client";


import Checkbox from "./ui/Checkbox";


interface Props {

  checked:boolean;

  setChecked:(value:boolean)=>void;

}



export default function RememberSection({
  checked,
  setChecked
}:Props){


return (

<div
className="
flex
items-center
justify-between
"
>


<label
className="
flex
items-center
gap-2
text-sm
cursor-pointer
"
>

<Checkbox

checked={checked}

onChange={(e)=>
setChecked(e.target.checked)
}

/>


<span>
Beni hatırla
</span>


</label>



<button

type="button"

className="
text-sm
hover:underline
"

>

Şifremi unuttum

</button>



</div>

);


}