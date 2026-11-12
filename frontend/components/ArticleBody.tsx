import Reveal from "./Reveal";

export default function ArticleBody({
  paragraphs,
  children,
}: {
  paragraphs?: string[];
  children?: React.ReactNode;
}) {
  return (
    <Reveal>
      <div className="mx-auto max-w-[680px] space-y-5 text-[15px] leading-[26px] text-ink/90 sm:text-[16px] sm:leading-[28px]">
        {paragraphs?.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
        {children}
      </div>
    </Reveal>
  );
}
