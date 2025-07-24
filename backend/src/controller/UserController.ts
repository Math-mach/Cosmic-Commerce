import { Request, Response } from 'express';

const UserService = require('../service/UserService');

const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    const { token, user } = await UserService.register({
      name,
      email,
      password,
    });

    return res.status(201).json({ token, user });
  } catch (error: any) {
    if (error.message === 'Este email já está cadastrado.') {
      return res.status(409).json({ message: error.message });
    }

    console.error('Erro no registro:', error);
    return res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
  }
};

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const { token, user } = await UserService.login(email, password);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/', // Garante que o cookie seja válido para todo o site
    });

    return res.status(200).json({ user });
  } catch (error: any) {
    if (error.message === 'Credenciais inválidas.') {
      return res.status(401).json({ message: error.message });
    }

    console.error('Erro no login:', error);
    return res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
  }
};

const logout = (req: Request, res: Response) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  });
  return res.status(200).json({ message: 'Logout realizado com sucesso.' });
};

const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Não foi possível identificar o usuário.' });
    }

    const user = await UserService.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    return res.status(200).json({ user });
  } catch (error: any) {
    console.error('Erro ao buscar dados do usuário:', error);
    return res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
  }
};

module.exports = { register, login, logout, getMe };
