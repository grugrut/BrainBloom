import { useEffect, useRef } from 'react';
import MindElixir from 'mind-elixir';
import "mind-elixir/style";
import { ja } from "mind-elixir/i18n";
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

const FILE_FILTERS = [{ name: "MindMap Files", extensions: ["mbloom"] }];

export default function MindMap() {
    const containerRef = useRef(null);
    const mindRef= useRef(null);
    const handlersRef = useRef({});
    const busyRef = useRef(false);

    useEffect(() => {
	const instance = new MindElixir({
	    el: "#map",
	    direction: MindElixir.RIGHT,
	    editable: true,
	    contextMenu: { locale: ja },
	    toolBar: true,
	    keypress: true,
	});
	instance.init(MindElixir.new('root'));
	mindRef.current = instance;

	const handleResize = () => {
	    if (mindRef.current) {
		mindRef.current.resize();
	    }
	};
	window.addEventListener("resize", handleResize);
	setTimeout(handleResize, 100);

	return () => {
	    window.removeEventListener("resize", handleResize);
	};
	
    }, []);

    // ダイアログ表示中の再実行(メニューとショートカットの二重発火など)を無視する
    const withDialogGuard = (fn) => async () => {
	if (busyRef.current) return;
	busyRef.current = true;
	try {
	    await fn();
	} finally {
	    busyRef.current = false;
	}
    };

    const handleSave = withDialogGuard(async () => {
	const path = await save({ filters: FILE_FILTERS });
	if (!path) return;
	const data = mindRef.current.getData();
	await writeTextFile(path, JSON.stringify(data, null, 2));
    });

    const handleOpen = withDialogGuard(async () => {
	const path = await open({ filters: FILE_FILTERS, multiple: false });
	if (!path) return;
	const data = JSON.parse(await readTextFile(path));
	mindRef.current.refresh(data);
    });

    // Windows ではメニューのアクセラレータが WebView にフォーカスがあると効かないため JS 側でも処理する
    useEffect(() => {
	const onKeyDown = (e) => {
	    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.isComposing) return;
	    const key = e.key.toLowerCase();
	    if (key === "s") {
		e.preventDefault();
		handlersRef.current.save();
	    } else if (key === "o") {
		e.preventDefault();
		handlersRef.current.open();
	    }
	};
	window.addEventListener("keydown", onKeyDown);
	return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    useEffect(() => {
	if (!window.__TAURI_INTERNALS__) {
	    console.warn("Tauri API is not available");
	    return;
	}

	// メニューからのイベントは常に最新のハンドラを呼ぶ必要があるため ref 経由にする
	const unlisteners = [
	    listen("menu-save", () => handlersRef.current.save()),
	    listen("menu-open", () => handlersRef.current.open()),
	];
	return () => {
	    unlisteners.forEach((p) => p.then((unlisten) => unlisten()));
	};
    }, []);

    handlersRef.current = { save: handleSave, open: handleOpen };

    return (
	<div id="map" style={{ height: "100vh", width: "100%", backgroundColor: "#f3f4f6" }}>
	    <div style={{ textAlign: "center", padding: "10px" }}>
		<button onClick={handleSave} style={{ marginRight: "10px" }}>
		    Save Mind Map
		</button>
		<button onClick={handleOpen}>
		    Open Mind Map
		</button>
	    </div>
	    <div ref={containerRef} style={{ height: "90%" }}></div>
	</div>
    );
}
