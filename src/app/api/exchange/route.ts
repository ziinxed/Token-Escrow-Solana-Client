import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  ACCOUNT_SIZE,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMintToCheckedInstruction,
  getMint
} from "@solana/spl-token";
import {
  PublicKey,
  Keypair,
  Connection,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  AccountMeta
} from "@solana/web3.js";
import {
  Metaplex,
  irysStorage,
  keypairIdentity
} from "@metaplex-foundation/js";
import {
  getEscrowAddress,
  Initialize,
  EscrowInstruction,
  decimalToIntegerString,
  Exchange
} from "@/app/_solana/program";
import BN from "bn.js";

export const dynamic = "force-dynamic"; // defaults to auto
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pubkey = searchParams.get("pubkey");
    const sellMintAddress = searchParams.get("sellMint");
    const buyMintAddress = searchParams.get("buyMint");
    const sellAmount = searchParams.get("sellAmount");
    const buyAmount = searchParams.get("buyAmount");
    const authorityAddress = searchParams.get("authority");

    if (
      !pubkey ||
      !sellMintAddress ||
      !buyMintAddress ||
      !sellAmount ||
      !buyAmount ||
      !authorityAddress
    ) {
      return Response.json({ error: "pubkey is required" }, { status: 400 });
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "",
      "processed"
    );

    const sellMint = new PublicKey(sellMintAddress);
    const buyMint = new PublicKey(buyMintAddress);

    const taker = new PublicKey(pubkey);
    const authority = new PublicKey(authorityAddress);

    const takerSellTokenAccount = getAssociatedTokenAddressSync(buyMint, taker);
    const takerBuyTokenAccount = getAssociatedTokenAddressSync(sellMint, taker);
    const authorityBuyTokenAccount = getAssociatedTokenAddressSync(
      buyMint,
      authority
    );

    const escrowAccount = getEscrowAddress(authority, sellMint);
    const escrowTokenAccount = getAssociatedTokenAddressSync(
      sellMint,
      escrowAccount,
      true
    );

    const tokenProgram = TOKEN_PROGRAM_ID;

    const escrowProgram = new PublicKey(
      "6U5mKXbakXsQWCA9FbccLXwaVmE9eivAMRswmVbmchJC"
    );

    const sellDecimal = await getMint(connection, new PublicKey(sellMint)).then(
      (res) => res.decimals
    );
    const buyDecimal = await getMint(connection, new PublicKey(buyMint)).then(
      (res) => res.decimals
    );

    const exchangeIx = new TransactionInstruction({
      keys: [
        { pubkey: authority, isSigner: false, isWritable: true },
        { pubkey: taker, isSigner: true, isWritable: true },
        { pubkey: buyMint, isSigner: false, isWritable: false },
        { pubkey: sellMint, isSigner: false, isWritable: false },
        { pubkey: takerSellTokenAccount, isSigner: false, isWritable: true },
        ,
        { pubkey: takerBuyTokenAccount, isSigner: false, isWritable: true },
        { pubkey: authorityBuyTokenAccount, isSigner: false, isWritable: true },
        { pubkey: escrowAccount, isSigner: false, isWritable: true },
        { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
        { pubkey: tokenProgram, isSigner: false, isWritable: false }
      ] as AccountMeta[],
      programId: escrowProgram,
      data: new Exchange({
        instruction: EscrowInstruction.Exchange,
        sell_amount: new BN(decimalToIntegerString(buyAmount, buyDecimal)),
        buy_amount: new BN(decimalToIntegerString(sellAmount, sellDecimal))
      }).toBuffer()
    });

    const tx = new Transaction();

    const buyATAInfo = await connection.getAccountInfo(takerBuyTokenAccount);
    console.log(buyATAInfo);
    if (buyATAInfo === null) {
      const createBuyATAIx = createAssociatedTokenAccountInstruction(
        taker,
        takerBuyTokenAccount,
        taker,
        sellMint
      );

      tx.add(createBuyATAIx);
    }
    tx.add(exchangeIx);

    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    tx.recentBlockhash = recentBlockhash;
    tx.feePayer = taker;

    const serialized_tx = tx.serialize({ requireAllSignatures: false });
    const encoded_tx = Buffer.from(serialized_tx).toString("base64");

    return Response.json({ tx: encoded_tx });
  } catch (err) {
    console.log(err);
    return Response.json({ error: err }, { status: 500 });
  }
}
