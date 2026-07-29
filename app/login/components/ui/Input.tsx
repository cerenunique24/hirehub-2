import React from "react";


interface InputProps
extends React.InputHTMLAttributes<HTMLInputElement>{}



export default function Input({

className="",
...props

}:InputProps){


return (

<input

{...props}

className={`
h-12
w-full
rounded-xl
border
border-gray-200
bg-white
px-4
text-sm
outline-none

placeholder:text-gray-400

focus:border-black
focus:ring-1
focus:ring-black

${className}

`}

/>

);


}