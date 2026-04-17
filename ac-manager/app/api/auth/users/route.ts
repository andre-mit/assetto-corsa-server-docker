import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, hashPassword, JWT_COOKIE_NAME } from "@/lib/auth";

async function getAuthUser(req: NextRequest) {
  const token = req.cookies.get(JWT_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/auth/users — list all users (MASTER or ADMIN only)
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth || (auth.role !== "MASTER" && auth.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users });
}

// POST /api/auth/users — create user (MASTER creates ADMIN/VIEWER; ADMIN creates VIEWER)
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth || (auth.role !== "MASTER" && auth.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { email, name, password, role } = await req.json();

  if (!email || !name || !password || !role) {
    return NextResponse.json(
      { error: "email, name, password and role are required." },
      { status: 400 }
    );
  }

  // ADMIN cannot create MASTER or another ADMIN
  if (auth.role === "ADMIN" && (role === "MASTER" || role === "ADMIN")) {
    return NextResponse.json(
      { error: "ADMINs can only create VIEWER users." },
      { status: 403 }
    );
  }

  // Nobody can create another MASTER
  if (role === "MASTER") {
    return NextResponse.json(
      { error: "MASTER user can only be created via seed." },
      { status: 403 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists." },
      { status: 409 }
    );
  }

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashed,
      role,
      createdById: auth.sub,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
