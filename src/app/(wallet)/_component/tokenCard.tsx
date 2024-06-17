import { formatDecimal, TokenData } from "@/app/_solana/program";
import Image from "next/image";

const TokenCard = (props: { token: TokenData }) => {
  const { token } = props;
  return (
    <div className="flex bg-violet-300 p-4 rounded-lg w-full justify-between items-stretch mb-1 text-violet-950 font-bold text-sm gap-4">
      <div className="flex flex-col gap-3 grow">
        <div className="flex flex-col gap-2">
          <div className="w-[60px] h-[60px] rounded-full overflow-hidden">
            <Image
              src={token.img || "/sol.png"}
              width={60}
              height={60}
              alt="token image"
            />
          </div>

          <div className="flex flex-col justify-center">
            <div>SYMBOL : {token.ticker}</div>
            <div>Mint: {token.mint}</div>
            <div>
              AMOUNT : {formatDecimal(token.amount.toString(), token.decimal)}
            </div>
            <div>DECIMAL : {token.decimal}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenCard;
