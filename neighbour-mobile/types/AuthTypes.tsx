export interface TokenType {
    refresh: string,
    access: string
}

export interface UserType {
    id: number | null,
    username: string | null,
    email: string,
    full_name: string

}