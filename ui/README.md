# Tic-Tac-Toe Front-end

This demo app showcases on-chain tic-tac-toe using shared objects for coordination between players.

This part of the demo illustrates how to:

-   Set-up an application to interact with a blockchain, using the Sui TypeScript
    SDK and dApp-kit, including deploying its Move packages.
-   Build UIs that represent on-chain data, and update in response to running
    transactions.
-   Using `devInspectTransactionBlock` to run Move code to extract more complex
    state from on-chain.

This dApp was created using `@mysten/create-dapp` that sets up a basic React
Client dApp using the following tools:

-   [React](https://react.dev/) as the UI framework
-   [TypeScript](https://www.typescriptlang.org/) for type checking
-   [Vite](https://vitejs.dev/) for build tooling
-   [Radix UI](https://www.radix-ui.com/) for pre-built UI components
-   [ESLint](https://eslint.org/)
-   [`@mysten/dapp-kit`](https://sdk.mystenlabs.com/dapp-kit) for connecting to
    wallets and loading data
-   [pnpm](https://pnpm.io/) for package management

## Starting your dApp

To install dependencies you can run

```bash
pnpm install
```

To start your dApp in development mode run

```bash
pnpm dev
```

## Building

To build your app for deployment you can run

```bash
pnpm build
```
