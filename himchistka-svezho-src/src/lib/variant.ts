// Два варианта одной сборки: VITE_CUTE=1 даёт милый маскот (руки, щёчки, пузыри),
// без него взрослая версия с детальной мебелью.
export const CUTE = import.meta.env.VITE_CUTE === '1';
export const HD = !CUTE;
