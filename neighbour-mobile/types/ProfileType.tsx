import {UserType} from "@/types/AuthTypes";

export interface ProfileType {
    user: UserType,
    profile_pic: string | null,
    phone_number: string
}