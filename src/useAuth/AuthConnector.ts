import {IProviderBuilder, IStateStorage} from "../types";
import {AuthProviderType, IAuthProvider, IAuthState} from "@elrond-giants/erdjs-auth/dist/types";
import StateStorage from "./StateStorage";
import {WebProvider} from "@elrond-giants/erdjs-auth";


type InitOptions = Partial<Omit<IAuthState, "authProviderType">> & { shortLived?: boolean };

const STORAGE_KEY = ".erd.auth";
export default class AuthConnector {
    protected storage: IStateStorage;
    protected builder: IProviderBuilder;
    private _provider: IAuthProvider | undefined;
    protected _onChange: (() => void) = () => {};

    constructor(builder: IProviderBuilder, storage: IStateStorage | null = null) {
        this.builder = builder;
        this.storage = storage ?? new StateStorage();
    }

    set onChange(value: () => void) {
        this._onChange = value;
    }

    get provider(): IAuthProvider | null {
        return this._provider ? this._provider : null;
    }

    async init(
        providerType: AuthProviderType | string,
        options: { shortLived?: boolean } = {shortLived: false}
    ): Promise<boolean> {
        return this.initProvider(this.builder.buildProvider(providerType), options);
    }

    saveState() {
        this.assertInitialised();
        // @ts-ignore
        this.storage.storeItem(STORAGE_KEY, this._provider.toJson());
    }

    async initFromStorage(): Promise<boolean> {
        const state = this.storage.getItem(STORAGE_KEY);
        if (null === state || state.authProviderType === AuthProviderType.NONE) {
            return false;
        }

        return this.initProvider(this.builder.buildProvider(state.authProviderType), state);

    }

    async logout() {
        this.assertInitialised();
        // @ts-ignore
        const result = await this._provider.logout();
        this.reset();

        return result;

    }

    initialised(): boolean {
        return this._provider !== undefined
    }

    protected async initProvider(provider: IAuthProvider, {
        address,
        authenticated,
        shortLived
    }: InitOptions) {
        if (provider instanceof WebProvider && address !== undefined) {
            provider.setState({
                address,
                authenticated: authenticated ?? !!address
            });
        }
        provider.on("login", () => {
            if (!shortLived) {
                this.saveState();
            }
            this._onChange();
        });
        provider.on("logout", () => {
            if (!shortLived) {
                this.saveState();
            }
            this.reset();
        });
        const initialised = await provider.init();
        this._provider = provider;
        if (!shortLived) {
            this.saveState();
        }

        return initialised;
    }

    protected assertInitialised() {
        if (!this.initialised()) {
            throw new Error("Auth connector must be initialised.");
        }
    }

    private reset() {
        this.storage.removeItem(STORAGE_KEY);
        delete this._provider;
        this._onChange();
    }

};
