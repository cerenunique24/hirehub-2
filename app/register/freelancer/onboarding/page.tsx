"use client";

import { useState } from "react";

import Stepper from "./components/Stepper";
import Step1 from "./components/Step1";
import Step2 from "./components/Step2";
import Step3 from "./components/Step3";
import Step4 from "./components/Step4";

export default function FreelancerOnboarding() {
  const [step, setStep] = useState(1);

  return (
    <main className="min-h-screen bg-[#fafafa] py-16 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm p-10">

        <Stepper step={step} />

        {step === 1 && (
          <Step1
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Step2
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <Step3
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <Step4
            onBack={() => setStep(3)}
          />
        )}

      </div>
    </main>
  );
}