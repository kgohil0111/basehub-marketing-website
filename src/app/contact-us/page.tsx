'use client';
import { useEffect } from "react";

export default function ContactUs() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js-na2.hsforms.net/forms/embed/244057702.js";
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div
        className="hs-form-frame w-full max-w-lg"
        data-region="na2"
        data-form-id="26a5bb65-4f16-4744-86ba-b91932ef84fc"
        data-portal-id="244057702"
      ></div>
    </div>
  );
}
