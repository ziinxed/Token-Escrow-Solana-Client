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

export const dynamic = "force-dynamic"; // defaults to auto
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pubkey = searchParams.get("pubkey");

    if (!pubkey) {
      return Response.json({ error: "pubkey is required" }, { status: 400 });
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "",
      "processed"
    );

    const metaplex = new Metaplex(connection);

    const user = new PublicKey(pubkey);

    const tokenList = await connection
      .getTokenAccountsByOwner(user, {
        programId: TOKEN_PROGRAM_ID
      })
      .then((res) => {
        return res.value.map((token) => {
          return unpackAccount(token.pubkey, token.account);
        });
      })
      .then((data) => {
        return Promise.all(
          data.map(async (token) => {
            const mint = await getMint(connection, new PublicKey(token.mint));
            return {
              amount: token.amount,
              mint: token.mint,
              decimal: mint.decimals
            };
          })
        );
      })
      .then((data) => {
        return Promise.all(
          data.map(async (token) => {
            const [img, ticker] = await metaplex
              .nfts()
              .findByMint({ mintAddress: new PublicKey(token.mint) })
              .then((res) => {
                return [res.json?.image, res.json?.symbol];
              })
              .catch((e) => {
                return [undefined, undefined];
              });
            return {
              img,
              ticker,
              amount: token.amount.toString(),
              mint: token.mint.toBase58(),
              decimal: token.decimal
            };
          })
        );
      });

    return Response.json({ tokenList });
  } catch (err) {
    console.log(err);
    return Response.json({ error: err }, { status: 500 });
  }
}
