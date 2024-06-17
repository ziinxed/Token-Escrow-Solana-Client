import { EscrowData } from "@/app/_solana/program";
import Image from "next/image";

const MyEscrowCard = (props: { escrow: EscrowData }) => {
  const { escrow } = props;
  return (
    <div className="flex bg-violet-300 p-4 rounded-lg w-full justify-between items-stretch mb-1 text-violet-950 font-bold text-sm gap-4">
      <div className="flex flex-col gap-3 grow">
        <div className="flex flex-col grow border-solid border-violet-900 border-2 p-2 rounded-md">
          <div>ESCROW ID : {escrow.escrowKey}</div>
          <div>ESCROW Authority : {escrow.authority}</div>
        </div>
        <div className="flex flex-row gap-2">
          <div className="h-[60px] w-[60px] rounded-full overflow-hidden">
            <Image
              src={escrow.sellMintImg || "/sol.png"}
              width={60}
              height={60}
              alt="token image"
            />
          </div>

          <div className="flex flex-col justify-center">
            <div>SELL Mint: {escrow.sellMint}</div>
            <div>AMOUNT : {escrow.sellAmount.toString()}</div>
          </div>
        </div>

        <div className="flex flex-row gap-2">
          <div className="h-[60px] w-[60px] rounded-full overflow-hidden">
            <Image
              src={escrow.buyMintImg || "/sol.png"}
              width={60}
              height={60}
              alt="token image"
            />
          </div>

          <div className="flex flex-col justify-center">
            <div>BUY Mint: {escrow.buyMint}</div>
            <div>AMOUNT : {escrow.buyAmount.toString()}</div>
          </div>
        </div>
      </div>
      <div className="">
        <button className="bg-violet-600 text-white rounded-lg h-full w-full p-8">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MyEscrowCard;
