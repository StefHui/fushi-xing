// Web stub for expo-sqlite — web storage uses localStorage instead (see saveRepository.ts).
export const openDatabaseAsync = async (_name: string) => ({
  execAsync: async () => {},
  runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
  getFirstAsync: async () => null,
  getAllAsync: async () => [],
});
