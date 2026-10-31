import { participantImage } from "@/shared/model/participants";

type Props = Readonly<{ identity: string; className?: string }>;

export function UserAvatar({ identity, className = "size-16" }: Props) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      <img src={participantImage(identity)} alt="" width={256} height={256} className="size-full object-contain" draggable={false} />
    </span>
  );
}
