/// <reference path="JWT.ts" />

class KeeAccount {
    private _features: string[] = [];
    public get features (): string[] {
        return this._features;
    }
    private _featureExpiry: number;
    public get featureExpiry (): number {
        return this._featureExpiry;
    }
    private _tokens: Tokens;
    public get tokens (): Tokens {
        return this._tokens;
    }

    async parseJWTs (JWTs: Tokens) {
        this._tokens = {};
        if (!JWTs || !JWTs.client) return;

        // Extract features from the client claim supplied by the server
        const jwt = JWTs.client;
        try {
            const {audience, claim} = await JWT.verify(jwt);
            if (audience === "client") {
                if (claim !== undefined) {
                    // Don't do anything if the JWT has expired a long time ago - user
                    // will need to sign in again on Kee Vault to re-enable premium features
                    if (claim.exp > Date.now() - 3600*24*30*1000) {
                        this._features = claim.features;
                        this._featureExpiry = claim.featureExpiry;
                        this._tokens.client = jwt;
                    }
                }
            }
        } catch (e) {
            console.log("Token error: " + e);
        }
    }
}

class AccountManager {
    private account: KeeAccount;
    private listeners: (() => void)[];

    async processNewTokens (tokens: Tokens) {
        await this.account.parseJWTs(tokens);
        this.notify();
    }

    private notify () {
        this.listeners.forEach(element => {
            element();
        });
    }

    addListener (listener) {
        this.listeners.push(listener);
    }

    public get features () : string[] {
        return this.account.features;
    }

    constructor () {
        this.account = new KeeAccount();
        this.listeners = [];
    }

    private featuresValidSecondsAgo (seconds: number) {
        return this.account.featureExpiry > Date.now() - seconds * 1000;
    }

    public get fe_multiSessionTypes () : boolean {
        return this.account.features.indexOf("multiSession") >= 0 && this.featuresValidSecondsAgo(3600*24*7);
    }

    public get fe_syncSettings () : boolean {
        return this.account.features.indexOf("syncSettings") >= 0 && this.featuresValidSecondsAgo(3600*24*14);
    }

    public get fe_formAccuracy () : boolean {
        return this.account.features.indexOf("formAccuracy") >= 0 && this.featuresValidSecondsAgo(3600*24*3);
    }
}
