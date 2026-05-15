import React from "react";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  isDark?: boolean;
}

const Section = ({ children, className = "", id, isDark = false }: SectionProps) => {
  return (
    <section
      id={id}
      className={`py-24 ${isDark ? "bg-brand-black text-white" : "bg-white text-brand-black"} ${className}`}
    >
      <div className="container mx-auto px-4 md:px-6">
        {children}
      </div>
    </section>
  );
};

export default Section;
