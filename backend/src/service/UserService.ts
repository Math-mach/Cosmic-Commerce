import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { IUser } from "../types/userTypes";
import config from "../config";
import { UUID } from "crypto";

const UserRepository = require("../repository/UserRepository");

type UserRegistrationData = Omit<IUser, "id" | "created_at" | "updated_at">;

interface AuthResponse {
    token: string;
    user: Omit<IUser, "password">;
}

const register = async (
    userData: UserRegistrationData
): Promise<AuthResponse> => {
    const existingUser = await UserRepository.loginUser(userData.email);

    if (existingUser) {
        throw new Error("Este email já está cadastrado.");
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser: IUser = await UserRepository.createUser({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
    });

    const token = jwt.sign(
        { id: newUser.id, email: newUser.email },
        config.JWT_SECRET as string,
        { expiresIn: "1d" }
    );

    const { password, ...userWithoutPassword } = newUser;

    return {
        token,
        user: userWithoutPassword,
    };
};

const login = async (email: string, pass: string): Promise<AuthResponse> => {
    const user: IUser | undefined = await UserRepository.loginUser(email);

    if (!user) {
        throw new Error("Credenciais inválidas.");
    }

    const isPasswordCorrect = await bcrypt.compare(pass, user.password);

    if (!isPasswordCorrect) {
        throw new Error("Credenciais inválidas.");
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        config.JWT_SECRET as string,
        { expiresIn: "1d" }
    );

    const { password, ...userWithoutPassword } = user;

    return {
        token,
        user: userWithoutPassword,
    };
};

const getUser = async (
    id: UUID
): Promise<Omit<IUser, "password"> | undefined> => {
    const user = await UserRepository.getUser(id);
    return user;
};

module.exports = { register, login, getUser };
