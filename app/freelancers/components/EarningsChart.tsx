"use client";

export default function EarningsChart(){

return (

<div className="
bg-white
border
rounded-2xl
p-6
">

<h3 className="
font-semibold
mb-5
">
Kazanç Analizi
</h3>


<div className="
h-40
flex
items-end
gap-5
">


{
[
{
month:"Oca",
height:"40%"
},
{
month:"Şub",
height:"60%"
},
{
month:"Mar",
height:"50%"
},
{
month:"Nis",
height:"85%"
},
{
month:"May",
height:"70%"
}

].map(item=>(


<div
key={item.month}
className="
flex
flex-col
items-center
gap-2
flex-1
"
>


<div
className="
w-full
bg-black
rounded-lg
"
style={{
height:item.height
}}
/>


<span className="
text-xs
text-gray-500
">
{item.month}
</span>


</div>


))


}


</div>


</div>

)

}