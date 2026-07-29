import React from "react";


interface ButtonProps
extends React.ButtonHTMLAttributes<HTMLButtonElement>{

  variant?: "default" | "outline";

}



export default function Button({

  children,
  variant="default",
  className="",
  ...props

}:ButtonProps){


return (

<button

{...props}

className={`
h-12
rounded-xl
px-5
text-sm
font-medium
transition
disabled:opacity-50
disabled:cursor-not-allowed

${
variant === "outline"

?

"border border-gray-200 bg-white hover:bg-gray-50"

:

"bg-black text-white hover:bg-gray-800"

}

${className}

`}

>

{children}

</button>

);


}