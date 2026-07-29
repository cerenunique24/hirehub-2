type StepperProps = {
    step: number;
  };
  
  const steps = [
    "Profil",
    "Portfolyo",
    "Tercihler",
    "Onay",
  ];
  
  export default function Stepper({ step }: StepperProps) {
    return (
      <div className="mb-12">
        <div className="flex items-center justify-between relative">
  
          {/* Çizgi */}
          <div className="absolute left-0 right-0 top-5 h-[2px] bg-gray-200 -z-10" />
  
          {steps.map((title, index) => {
            const current = index + 1;
            const active = current <= step;
  
            return (
              <div
                key={title}
                className="flex flex-col items-center flex-1"
              >
                <div
                  className={`
                    w-10
                    h-10
                    rounded-full
                    flex
                    items-center
                    justify-center
                    font-semibold
                    transition-all
                    ${
                      active
                        ? "bg-black text-white"
                        : "bg-white border border-gray-300 text-gray-400"
                    }
                  `}
                >
                  {current}
                </div>
  
                <span
                  className={`
                    mt-3
                    text-sm
                    ${
                      active
                        ? "text-black font-medium"
                        : "text-gray-400"
                    }
                  `}
                >
                  {title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }