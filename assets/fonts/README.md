# Then font assets

The app uses `ThenScript_400Regular` for handwritten accents. It is currently backed by the bundled Bad Script Google font in `App.tsx`.

If Then licenses Biro Script for mobile app embedding, place the licensed `.ttf` or `.otf` file in this folder and swap the `ThenScript_400Regular` loader in `App.tsx` to require that local font file.
