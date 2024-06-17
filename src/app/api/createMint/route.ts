import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  ACCOUNT_SIZE,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMintToCheckedInstruction
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

export const dynamic = "force-dynamic"; // defaults to auto
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pubkey = searchParams.get("pubkey");

    if (!pubkey) {
      return Response.json({ error: "pubkey is required" }, { status: 400 });
    }
    const apiKey = process.env.OPENAI_API_KEY || "";
    const openai = new OpenAI({ apiKey: apiKey });

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

    const metaplex = new Metaplex(connection);
    metaplex.use(
      irysStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000
      })
    );
    metaplex.use(keypairIdentity(payerKp));

    const mintKp = new Keypair();

    const receiver = new PublicKey(pubkey);
    const mint = mintKp.publicKey;

    const receiverAta = getAssociatedTokenAddressSync(mint, receiver);

    const systemProgram = SystemProgram.programId;
    const tokenProgram = TOKEN_PROGRAM_ID;
    const associatedProgram = ASSOCIATED_TOKEN_PROGRAM_ID;
    const escrowProgram = new PublicKey(
      "6U5mKXbakXsQWCA9FbccLXwaVmE9eivAMRswmVbmchJC"
    );

    const tokenDecimals = Math.floor(Math.random() * 10);

    const token = await openai.chat.completions
      .create({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          {
            role: "user",
            content:
              "Create new symbol for crypto token under 6 characters. just give me word under 6 character as answer"
          }
        ],
        model: "gpt-3.5-turbo"
      })
      .then((res) => {
        return res.choices[0].message.content || "unamed";
      })
      .catch((res) => {
        return "unnamed";
      });

    const tokenResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `round crypto symbol image with ticker ${token}`,
      n: 1,
      size: "1024x1024"
    });

    const token_image_url = tokenResponse.data[0].url;

    let { uri } = await metaplex.nfts().uploadMetadata({
      name: token,
      symbol: `$${token}`,
      description: token,
      image: token_image_url
    });

    let mint_lamports = await connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );

    let mintCreateIx = SystemProgram.createAccount({
      fromPubkey: payer,
      lamports: mint_lamports,
      newAccountPubkey: mint,
      programId: tokenProgram,
      space: MINT_SIZE
    });

    let mintInitialize = createInitializeMint2Instruction(
      mint,
      tokenDecimals,
      payer,
      payer
    );

    let tokenAccountCreateIx = createAssociatedTokenAccountInstruction(
      payer,
      receiverAta,
      receiver,
      mint
    );

    let transferIx = SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: receiver,
      lamports: 10000000
    });

    let mintToIx = createMintToCheckedInstruction(
      mint,
      receiverAta,
      payer,
      BigInt(Math.floor(Math.random() * 10000000000)),
      tokenDecimals
    );

    const metadataIx = await metaplex
      .nfts()
      .builders()
      .createSft({
        uri: uri,
        name: token.slice(0, 6),
        symbol: `$${token.slice(0, 6)}`,
        sellerFeeBasisPoints: 0,
        updateAuthority: payerKp,
        useExistingMint: mint,
        mintAuthority: payerKp
      })
      .then((res) => res.getInstructions()[0]);

    const tx = new Transaction();
    tx.add(mintCreateIx)
      .add(mintInitialize)
      .add(tokenAccountCreateIx)
      .add(transferIx)
      .add(mintToIx)
      .add(metadataIx);

    const txId = await sendAndConfirmTransaction(connection, tx, [
      payerKp,
      mintKp
    ]);

    return Response.json({ txId });
  } catch (err) {
    console.log(err);
    return Response.json({ error: err }, { status: 500 });
  }
}
