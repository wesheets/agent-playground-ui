import React from 'react';
import Head from 'next/head';
import Playground from '../src/pages/Playground';
import '../src/styles/globals.css';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Promethios Agent Playground</title>
        <meta name="description" content="Real-time agent playground interface for Promethios" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <main>
        <Playground />
      </main>
    </div>
  );
}
