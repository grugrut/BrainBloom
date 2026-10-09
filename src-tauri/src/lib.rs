use tauri::{
    menu::{Menu, MenuItem, Submenu},
    Emitter, Manager,
};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let open = MenuItem::with_id(app, "menu-open", "Open", true, Some("CmdOrCtrl+O"))?;
            let save = MenuItem::with_id(app, "menu-save", "Save", true, Some("CmdOrCtrl+S"))?;
            let file = Submenu::with_items(app, "File", true, &[&open, &save])?;

            let reload = MenuItem::with_id(app, "menu-reload", "Reload", true, Some("CmdOrCtrl+R"))?;
            let devtools = MenuItem::with_id(
                app,
                "menu-devtools",
                "Toggle Developer Tools",
                true,
                Some("CmdOrCtrl+Shift+I"),
            )?;
            let develop = Submenu::with_items(app, "Develop", true, &[&reload, &devtools])?;

            let menu = Menu::with_items(app, &[&file, &develop])?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            id @ ("menu-open" | "menu-save") => {
                let _ = app.emit(id, ());
            }
            "menu-reload" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.eval("location.reload()");
                }
            }
            "menu-devtools" => {
                if let Some(w) = app.get_webview_window("main") {
                    if w.is_devtools_open() {
                        w.close_devtools();
                    } else {
                        w.open_devtools();
                    }
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running BrainBloom");
}
