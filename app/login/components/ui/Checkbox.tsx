"use client";


import React from "react";


interface CheckboxProps
extends React.InputHTMLAttributes<HTMLInputElement>{}



export default function Checkbox({

className="",
...props

}:CheckboxProps){


return (

<input

type="checkbox"

{...props}

className={`
h-4
w-4
rounded
border-gray-300
accent-black
cursor-pointer

${className}

`}

/>

);


}