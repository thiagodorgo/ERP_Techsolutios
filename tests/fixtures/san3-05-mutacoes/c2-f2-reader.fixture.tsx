declare const prisma: {
  c2ForceQualified: { findMany(): unknown };
  c2ForceDefault: { findMany(): unknown };
  c2ForceControl: { findMany(): unknown };
};

export function run() {
  return [
    prisma.c2ForceQualified.findMany(),
    prisma.c2ForceDefault.findMany(),
    prisma.c2ForceControl.findMany(),
  ];
}
