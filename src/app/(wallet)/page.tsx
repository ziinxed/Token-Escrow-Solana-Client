"use client";
import Image from "next/image";
import { useState, useEffect, ReactEventHandler } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import React, { useCallback } from "react";
import {
  WalletDisconnectButton,
  WalletMultiButton
} from "@/app/_component/wallet/Button";
import { getEscrowList, EscrowData, TokenData } from "../_solana/program";
import EscrowCard from "@/app/(wallet)/_component/escrowCard";
import MyEscrowCard from "./_component/myCard";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TokenCard from "./_component/tokenCard";
import { Transaction, TransactionMessage } from "@solana/web3.js";

export const ToastMsg = ({ txid }: { txid: string }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <p>Transaction ID: {txid}</p>
      <a
        href={`https://explorer.solana.com/tx/${txid}?cluster=devnet`}
        target="_blank"
        rel="noreferrer"
      >
        View on Solana Explorer
      </a>
    </div>
  );
};

export default function Home() {
  const { connection } = useConnection();
  const [tab, setTab] = useState(0);
  const [openEscrows, setOpenEscrows] = useState<EscrowData[]>([]);
  const [myEscrows, setMyEscrows] = useState<EscrowData[]>([]);
  const [userTokens, setUserTokens] = useState<TokenData[]>([]);

  const [escrowLoading, setEscrowLoading] = useState<boolean>(false);
  const [tokenLoading, setTokenLoading] = useState<boolean>(false);

  const [mintAmount, setMintAmount] = useState<string>("");
  const [mintAddress, setMintAddress] = useState<string>("");

  const [sellMintAddress, setSellMintAddress] = useState<string>("");
  const [sellAmount, setSellAmount] = useState<string>("");

  const [buyMintAddress, setBuyMintAddress] = useState<string>("");
  const [buyAmount, setBuyAmount] = useState<string>("");

  const { publicKey, sendTransaction, connected, connecting, signTransaction } =
    useWallet();

  const notify = (promise: Promise<string>) => {
    return toast.promise(
      promise,
      {
        pending: "TX is Pending 🕒",
        success: {
          render: ({ data }) => <ToastMsg txid={data} />,
          autoClose: 5000
        },
        error: "TX Failed 🤯"
      },
      { position: "bottom-right" }
    );
  };

  const handleMintAmount = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMintAmount(event.target.value);
  };
  const handleMintAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMintAddress(event.target.value);
  };

  const handleSellMintAddress = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSellMintAddress(event.target.value);
  };

  const handleBuyMintAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBuyMintAddress(event.target.value);
  };

  const handleSellAmount = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSellAmount(event.target.value);
  };

  const handleBuyAmount = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBuyAmount(event.target.value);
  };

  const handleMintToken = async () => {
    if (mintAmount === "" || mintAddress === "") {
      return;
    }
    await notify(
      fetch(
        `/api/mintToken?pubkey=${publicKey?.toBase58()}&amount=${mintAmount}&mint=${mintAddress}`,
        {
          method: "GET",
          cache: "no-cache",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" }
        }
      )
        .then((res) => res.json())
        .then((data) => data.txId)
    );
    setMintAddress("");
    setMintAmount("");
    setTokenLoading(true);
    await fetchMyTokens();
    setTokenLoading(false);
  };

  const handleCreateEscrow = async () => {
    if (
      sellMintAddress === "" ||
      sellAmount === "" ||
      buyMintAddress === "" ||
      buyAmount === ""
    ) {
      return;
    }
    await notify(
      (async function () {
        const txData = await fetch(
          `/api/createEscrow?pubkey=${publicKey?.toBase58()}&sellMint=${sellMintAddress}&buyMint=${buyMintAddress}&sellAmount=${sellAmount}&buyAmount=${buyAmount}`,
          {}
        )
          .then((res) => res.json())
          .then((data) => data.tx);

        const tx = Transaction.from(
          Uint8Array.from(Buffer.from(txData, "base64"))
        );

        return sendTransaction(tx, connection, { skipPreflight: true });
      })()
    );

    setBuyAmount("");
    setSellAmount("");
    setBuyMintAddress("");
    setSellMintAddress("");

    if (tab === 0) fetchEscrows();
    else fetchMyEscrows();
  };

  const handleExchange = async (escrow: EscrowData) => {
    if (escrow === null) {
      return;
    }
    await notify(
      (async function () {
        const txData = await fetch(
          `/api/exchange?pubkey=${publicKey?.toBase58()}&authority=${
            escrow.authority
          }&sellMint=${escrow.sellMint}&buyMint=${escrow.buyMint}&sellAmount=${
            escrow.sellAmount
          }&buyAmount=${escrow.buyAmount}`,
          {}
        )
          .then((res) => res.json())
          .then((data) => data.tx);

        const tx = Transaction.from(
          Uint8Array.from(Buffer.from(txData, "base64"))
        );

        return sendTransaction(tx, connection, { skipPreflight: true });
      })()
    );
    setEscrowLoading(true);
    if (tab === 0) fetchEscrows();
    else fetchMyEscrows();
    setEscrowLoading(false);
  };

  const fetchEscrows = useCallback(async () => {
    const escrows = await fetch("/api/getEscrowList?pubkey=", {})
      .then((res) => res.json())
      .then((data) => data.escrowList);
    setOpenEscrows(escrows);
  }, []);

  const fetchMyEscrows = useCallback(async () => {
    if (publicKey === null) return;
    const escrows = await fetch(
      "/api/getEscrowList?pubkey=" + publicKey.toBase58(),
      {}
    )
      .then((res) => res.json())
      .then((data) => data.escrowList);
    setMyEscrows(escrows);
  }, [publicKey]);

  const fetchMyTokens = useCallback(async () => {
    if (publicKey === null) return;
    const tokenList = await fetch(
      "/api/getTokenList?pubkey=" + publicKey.toBase58(),
      {}
    )
      .then((res) => res.json())
      .then((data) => data.tokenList);
    setUserTokens(tokenList);
  }, [publicKey]);

  useEffect(() => {
    const setEscrowList = async () => {
      await fetchEscrows();
      setEscrowLoading(false);
    };
    const setMyEscrowList = async () => {
      await fetchMyEscrows();
      setEscrowLoading(false);
    };

    if (tab === 0) {
      setEscrowLoading(true);
      setEscrowList();
    } else {
      setEscrowLoading(true);
      setMyEscrowList();
    }
  }, [tab, fetchEscrows, fetchMyEscrows]);

  useEffect(() => {
    const getTokenList = async () => {
      await fetchMyTokens();
      setTokenLoading(false);
    };
    if (connected) {
      setTokenLoading(true);
      getTokenList();
    }
  }, [connected, fetchMyTokens]);

  if (!connected) {
    if (!connecting) {
      return (
        <div className="flex justify-center items-center w-full min-h-screen">
          <WalletMultiButton />
        </div>
      );
    } else {
      return (
        <div className="flex flex-col justify-center items-center w-full min-h-screen">
          <div>Connecting to Wallet ...</div>
          <WalletDisconnectButton />
        </div>
      );
    }
  }
  return (
    <div className="flex flex-col justify-center items-center w-full max-h-screen p-4 gap-2">
      <div className="flex w-full justify-between">
        <p className="w-full text-xl font-extrabold">USER TOKEN LIST</p>
        <WalletMultiButton />
      </div>

      <div className="flex-col border-solid border-2 border-violet-400 rounded-lg min-h-[140px] max-h-[200px] w-full justify-center items-center p-1 gap-2 overflow-y-scroll">
        {tokenLoading ? (
          <p>loading token holdings</p>
        ) : (
          userTokens.sort().map((token, i) => {
            return <TokenCard token={token} key={i} />;
          })
        )}
      </div>
      <div className="flex flex-row justify-between gap-2 w-full mb-4">
        <button
          className="flex-1 bg-violet-600 p-4 rounded-lg w-full justify-between mb-1 text-white font-bold"
          onClick={async () => {
            await notify(
              fetch(`/api/createMint?pubkey=${publicKey?.toBase58()}`, {
                method: "GET",
                cache: "no-cache",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" }
              })
                .then((res) => res.json())
                .then((data) => data.txId)
            );
            setTokenLoading(true);
            await fetchMyTokens();
            setTokenLoading(false);
          }}
        >
          create token
        </button>
        <div className="flex flex-col items-stretch gap-2 grow bg-violet-600 p-4 rounded-lg w-full justify-center mb-1 text-white font-bold">
          <button
            onClick={async () => {
              await handleMintToken();
              setTokenLoading(true);
              await fetchMyTokens();
              setTokenLoading(false);
            }}
          >
            mint token
          </button>
          <input
            className="border-solid border-1 border-violet-400 rounded-lg p-2 bg-violet-200 text-black"
            type="text"
            value={mintAddress}
            placeholder="enter token mint address here"
            onChange={handleMintAddress}
          ></input>
          <input
            className="border-solid border-1 border-violet-400 rounded-lg p-2 bg-violet-200 text-black"
            type="text"
            value={mintAmount}
            onChange={handleMintAmount}
            placeholder="enter amount here"
          ></input>
        </div>
        <div className="flex flex-col items-stretch gap-2 grow bg-violet-600 p-4 rounded-lg w-full mb-1 text-white font-bold">
          <button onClick={handleCreateEscrow}>create escrow</button>
          <div className="flex gap-2 w-full justify-between">
            <input
              className="w-full border-solid border-1 border-violet-400 rounded-lg p-2 bg-violet-200 text-black"
              type="text"
              placeholder="enter sell token mint address here"
              value={sellMintAddress}
              onChange={handleSellMintAddress}
            ></input>

            <input
              className="border-solid border-1 border-violet-400 rounded-lg p-2 bg-violet-200 text-black"
              type="text"
              value={sellAmount}
              onChange={handleSellAmount}
              placeholder="enter sell amount here"
            ></input>
          </div>

          <div className="flex gap-2 w-full justify-between">
            <input
              className="w-full border-solid border-1 border-violet-400 rounded-lg p-2 bg-violet-200 text-black"
              type="text"
              placeholder="enter buy token mint address here"
              value={buyMintAddress}
              onChange={handleBuyMintAddress}
            ></input>

            <input
              className="border-solid border-1 border-violet-400 rounded-lg p-2 bg-violet-200 text-black"
              type="text"
              value={buyAmount}
              onChange={handleBuyAmount}
              placeholder="enter buy amount here"
            ></input>
          </div>
        </div>
      </div>
      <p className="w-full text-xl font-extrabold mb-2">ESCROW LIST</p>
      {tab === 0 ? (
        <>
          <div className="flex border-solid border-2 border-violet-400 rounded-lg w-full justify-center items-center p-1 gap-2">
            <button
              className="grow text-center bg-[#512da8] text-white text-lg font-bold h-full rounded-2xl p-1"
              onClick={() => {
                setTab(0);
              }}
            >
              Open Escrows
            </button>

            <button
              className="grow text-center text-lg h-full"
              onClick={() => {
                setTab(1);
              }}
            >
              My Escrows
            </button>
          </div>
          <button
            className="flex-1 bg-violet-600 p-4 rounded-lg w-full justify-between mb-1 text-white font-bold"
            onClick={fetchEscrows}
          >
            refresh Escrow list
          </button>

          <div className="flex flex-col grow w-full border-violet-400 border-solid border-2 bg-violet-800 text-white rounded-lg p-4 overflow-y-scroll gap-2">
            {escrowLoading ? (
              <p>loading escrows</p>
            ) : openEscrows.length === 0 ? (
              <p>NO ACTIVE ESCROW</p>
            ) : (
              openEscrows.map((escrow, i) => {
                return (
                  <EscrowCard
                    escrow={escrow}
                    key={i}
                    handleExchange={handleExchange}
                  />
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex border-solid border-2 border-violet-400 rounded-lg w-full justify-center items-center p-1 gap-2">
            <button
              className="grow text-center h-full rounded-2xl p-1"
              onClick={() => {
                setTab(0);
              }}
            >
              Open Escrows
            </button>

            <button
              className="grow text-center h-full bg-[#512da8] text-white text-lg font-bold rounded-2xl p-1"
              onClick={() => {
                setTab(1);
              }}
            >
              My Escrows
            </button>
          </div>
          <button
            className=" bg-violet-200 p-3 rounded-lg w-full justify-between mb-1 font-bold border-solid border-violet-600 border-4"
            onClick={fetchMyEscrows}
          >
            refresh list
          </button>

          <div className="flex flex-col grow w-full border-violet-600 border-solid border-2 bg-violet-200 rounded-lg p-4 overflow-y-scroll gap-2">
            {escrowLoading ? (
              <p>loading escrows</p>
            ) : myEscrows.length === 0 ? (
              <p>NO ACTIVE ESCROW</p>
            ) : (
              myEscrows.map((escrow, i) => {
                return <MyEscrowCard escrow={escrow} key={i} />;
              })
            )}
          </div>
        </>
      )}
      <ToastContainer />
    </div>
  );
}
