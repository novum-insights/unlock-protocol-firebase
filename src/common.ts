const configPath = `${process.cwd()}/unlock-integration.config.json`

export function createMessage(messageToken: string, userAccount: string) {
    const token = `novuminsights.com::${messageToken}`;
    return `Verify ownership of ${userAccount}: ${token}`
}

export function getUnlockConfig() {
    return require(configPath)
}