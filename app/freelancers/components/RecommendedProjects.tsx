export default function RecommendedProjects(){

  const projects=[
  "Fintech Mobil Uygulama Tasarımı",
  "SaaS Dashboard UI",
  "E-Ticaret UX İyileştirme"
  ];
  
  
  return (
  
  <div className="
  bg-white
  border
  rounded-xl
  p-5
  ">
  
  
  <h3 className="
  font-semibold
  mb-4
  ">
  Sana Önerilen Projeler
  </h3>
  
  
  <div className="
  space-y-3
  ">
  
  
  {
  projects.map(project=>(
  
  <div
  key={project}
  className="
  border
  rounded-xl
  p-4
  hover:bg-gray-50
  transition
  "
  >
  
  
  <p className="
  text-sm
  font-medium
  ">
  {project}
  </p>
  
  
  <p className="
  text-xs
  text-gray-500
  mt-1
  ">
  UI/UX Design • Uzaktan
  </p>
  
  
  </div>
  
  
  ))
  }
  
  
  </div>
  
  
  </div>
  
  )
  
  }