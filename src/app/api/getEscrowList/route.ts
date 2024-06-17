import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  ACCOUNT_SIZE,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMintToCheckedInstruction,
  unpackAccount,
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
import { getEscrowList } from "@/app/_solana/program";

export const dynamic = "force-dynamic"; // defaults to auto
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pubkey = searchParams.get("pubkey");

    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "",
      "processed"
    );
    if (pubkey) {
      const user = new PublicKey(pubkey);

      const escrowList = await getEscrowList(connection, user);
      return Response.json({ escrowList });
    } else {
      const escrowList = await getEscrowList(connection);
      return Response.json({ escrowList });
    }
  } catch (err) {
    console.log(err);
    return Response.json({ error: err }, { status: 500 });
  }
}
