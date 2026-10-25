-- M15 (A12): ALTER TYPE ... ADD VALUE é tratado como não transacional; sem declaração -> G5.
ALTER TYPE "caso_status" ADD VALUE 'arquivado';
