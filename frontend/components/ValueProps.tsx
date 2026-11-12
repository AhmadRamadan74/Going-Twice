import { valueProps } from "@/lib/data";
import Reveal from "./Reveal";

export default function ValueProps() {
  return (
    <section className="theme-section border-y-[0.8px] border-line bg-[#D5DDD1] py-10 sm:py-14">
      <div className="container-page">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          {valueProps.map((item, index) => (
            <Reveal key={item.title} delay={index * 90} variant="up">
              <div className="flex flex-col items-center text-center">
                <span className="grid size-11 place-items-center rounded-full border-[0.8px] border-wine/30 text-[16px] leading-6 text-wine">
                  {item.symbol}
                </span>
                <h3 className="pt-4 font-display text-[18px] leading-[27px] text-ink sm:text-[19px] sm:leading-[28.5px]">
                  {item.title}
                </h3>
                <p className="max-w-[252px] pt-2 text-[13px] leading-[21.125px] text-muted">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
