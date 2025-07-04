import { UUID } from "crypto";
import db from "../db/connection";
import { IUser } from "../types/userTypes";

const createUser = async (
    userData: Omit<IUser, "id" | "created_at" | "updated_at">
): Promise<IUser> => {
    const [newUser] = await db("users").insert(userData).returning("*");
    return newUser;
};

const loginUser = async (email: string): Promise<IUser | undefined> => {
    const user = await db("users").where({ email }).first();
    return user;
};

const getUser = async (
    id: UUID
): Promise<Omit<IUser, "password"> | undefined> => {
    const user = await db("users")
        .select("id", "name", "email", "created_at", "updated_at")
        .where({ id })
        .first();
    return user;
};

module.exports = { createUser, loginUser, getUser };
