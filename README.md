# Elrond React Hooks

### Overview

This is a library of React hooks built for the Elrond ecosystem. It aims to make it easy to authenticate, sign and send*
transactions, and query* smart contracts.

It makes authentication as easy as:

```typescript jsx
const {login} = useAuth();

await login(AuthProviderType.WEBWALLET);
```

&ast; useTransaction and useQuery will be available soon.

### Install

```bash
npm install @elrond-giants/erd-react-hooks
```

`@elrond-giants/erd-react-hooks` requires react 16.8+

### Hooks

#### `useAuth`

This hook makes it easy to authenticate with Maiar App, Web Wallet, Extension, and Ledger. It offers a context provider
to keep track of the authentication status.

##### How to use

1. Wrap your components in the provided AuthContextProvider.

```typescript jsx
import {AuthContextProvider} from "@elrond-giants/erd-react-hooks";


<AuthContextProvider env={"devnet"}>
    .....
</AuthContextProvider>
```

2. Use the value provided by AuthContextProvider.

```typescript jsx
import {useAuth} from "@elrond-giants/erd-react-hooks";
import {AuthProviderType} from "@elrond-giants/erd-react-hooks/dist/types";


function AuthComponent() {
    const {address, authenticated, login, logout} = useAuth();

    return (
        <div>
            <span>address: {address}</span>
            <span>authenticated: {authenticated ? "yes" : "no"}</span>
            <button onClick={async () => {
                await login(AuthProviderType.EXTENSION);
            }}>
                Login
            </button>
        </div>
    );
}
```

You can pass an object with a `token` to the `login` method, and it will be included in the auth signature.

```typescript
const {provider, login} = useAuth();
const token = "some_token";

await login(AuthProviderType.MAIAR, {token});
const authSignature = provider.getSignature();
```

:grey_exclamation: When using the *Maiar provider*, the login method will return a promise that resolves with a URL.
It's a usual practice to put this URL in a QR code and let users scan it with Maiar App.

When using the *Ledger provider* you MUST set the `ledgerAccountIndex` in the options object of the `login` method.

The `getLedgerAccounts(page?: number | undefined, pageSize?: number | undefined): Promise<string[]>` method can be used to get a list of accounts.

```typescript
const {login, getLedgerAccounts} = useAuth();
const accounts = getLedgerAccounts();

// --------

const selectedAccountIndex = 1;
await login(AuthProviderType.LEDGER, {ledgerAccountIndex: selectedAccountIndex});
```

#### `useTransaction` - coming soon
#### `useQuery` - coming soon
