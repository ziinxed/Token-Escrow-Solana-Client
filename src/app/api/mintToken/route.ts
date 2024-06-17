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
  SYSVAR_RENT_PUBKEY
} from "@solana/web3.js";
import {
  Metaplex,
  irysStorage,
  keypairIdentity
} from "@metaplex-foundation/js";
import * as borsh from "borsh";
import * as fs from "fs";
import BN from "bn.js";
import OpenAI from "openai";
import { decimalToIntegerString } from "@/app/_solana/program";

export const dynamic = "force-dynamic"; // defaults to auto
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pubkey = searchParams.get("pubkey");
    const mintAmount = searchParams.get("amount");
    const mintAddress = searchParams.get("mint");

    if (!pubkey || !mintAmount || !mintAddress) {
      return Response.json({ error: "missing is field" }, { status: 400 });
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "",
      "processed"
    );

    const payerKp = Keypair.fromSecretKey(
      Uint8Array.from(
        JSON.parse(
          fs.readFileSync("/Users/deok/.config/solana/id.json", "utf-8")
        )
      )
    );
    const payer = payerKp.publicKey;

    const decimal = await getMint(connection, new PublicKey(mintAddress)).then(
      (res) => res.decimals
    );

    const receiver = new PublicKey(pubkey);
    const mint = new PublicKey(mintAddress);
    const amount = BigInt(decimalToIntegerString(mintAmount, Number(decimal)));
    const receiverAta = getAssociatedTokenAddressSync(mint, receiver);

    const ata_info = await connection.getAccountInfo(receiverAta);

    let tokenAccountCreateIx = createAssociatedTokenAccountInstruction(
      payer,
      receiverAta,
      receiver,
      mint
    );

    let mintToIx = createMintToCheckedInstruction(
      mint,
      receiverAta,
      payer,
      amount,
      Number(decimal)
    );

    const tx = new Transaction();

    if (!ata_info) {
      tx.add(tokenAccountCreateIx);
    }

    tx.add(mintToIx);

    const txId = await sendAndConfirmTransaction(connection, tx, [payerKp]);

    return Response.json({ txId });
  } catch (err) {
    console.log(err);
    return Response.json({ error: err }, { status: 500 });
  }
}
