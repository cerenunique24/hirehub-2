"use client";

import { useEffect, useRef } from "react";

/**
 * 6 haneli e-posta doğrulama kodu için erişilebilir OTP input.
 *
 * - Sadece rakam kabul eder, bir karakter girilince otomatik olarak
 *   bir sonraki kutuya geçer.
 * - Backspace, boş bir kutudayken bir önceki kutuya döner.
 * - Herhangi bir kutuya 6 haneli bir kod yapıştırılırsa (ör. e-postadan
 *   kopyalanan kod) tüm kutulara otomatik dağıtılır.
 * - `inputMode="numeric"` ile mobilde numeric klavye açılır.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
    // Sadece ilk mount'ta odaklan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  function setDigitAt(index: number, digit: string) {
    const chars = value.split("");
    chars[index] = digit;

    const next = chars.join("").slice(0, length);
    onChange(next);

    if (next.length === length && !next.includes("")) {
      onComplete?.(next);
    }
  }

  function handleChange(index: number, rawValue: string) {
    const digitsOnly = rawValue.replace(/\D/g, "");

    if (digitsOnly.length === 0) {
      setDigitAt(index, "");
      return;
    }

    if (digitsOnly.length > 1) {
      // Kullanıcı bu kutuya birden fazla karakter yapıştırdı/yazdı —
      // baştan itibaren dağıt (paste ile aynı davranış).
      distributeCode(index, digitsOnly);
      return;
    }

    setDigitAt(index, digitsOnly);

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function distributeCode(startIndex: number, code: string) {
    const chars = value.split("");

    for (let i = 0; i < code.length && startIndex + i < length; i++) {
      chars[startIndex + i] = code[i];
    }

    const finalValue = Array.from({ length }, (_, i) => chars[i] ?? "").join("");

    onChange(finalValue);

    const lastFilledIndex = Math.min(startIndex + code.length, length) - 1;
    const focusIndex = Math.min(lastFilledIndex + 1, length - 1);
    inputRefs.current[focusIndex]?.focus();

    if (finalValue.length === length && !finalValue.includes("")) {
      onComplete?.(finalValue);
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      if (digits[index]) {
        setDigitAt(index, "");
        return;
      }

      if (index > 0) {
        event.preventDefault();
        setDigitAt(index - 1, "");
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");

    if (!pasted) return;

    event.preventDefault();
    distributeCode(index, pasted);
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="6 haneli doğrulama kodu">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          aria-label={`Doğrulama kodu, ${index + 1}. hane`}
          className="h-12 w-10 rounded-[var(--radius-input)] border border-[var(--color-border-subtle)] text-center text-lg font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary-600)] focus:ring-2 focus:ring-[var(--color-primary-50)] disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:w-12 sm:text-xl"
        />
      ))}
    </div>
  );
}
