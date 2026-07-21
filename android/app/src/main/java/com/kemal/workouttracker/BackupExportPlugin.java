package com.kemal.workouttracker;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "BackupExport")
public class BackupExportPlugin extends Plugin {

    @PluginMethod
    public void saveJson(PluginCall call) {
        String content = call.getString("content");
        String requestedName = call.getString(
            "filename",
            "workout-backup.json"
        );

        if (content == null || content.isEmpty()) {
            call.reject("Backup content is empty.");
            return;
        }

        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);

        if (bytes.length == 0) {
            call.reject("Backup ima 0 bajtov.");
            return;
        }

        String filename = sanitizeFilename(requestedName);

        try {
            JSObject result;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                result = saveWithMediaStore(
                    filename,
                    bytes
                );
            } else {
                result = saveLegacyDownload(
                    filename,
                    bytes
                );
            }

            call.resolve(result);
        } catch (Exception error) {
            call.reject(
                "Backup ni bil shranjen.",
                null,
                error
            );
        }
    }

    private JSObject saveWithMediaStore(
        String filename,
        byte[] bytes
    ) throws Exception {
        ContentResolver resolver =
            getContext().getContentResolver();

        ContentValues values = new ContentValues();
        values.put(
            MediaStore.MediaColumns.DISPLAY_NAME,
            filename
        );
        values.put(
            MediaStore.MediaColumns.MIME_TYPE,
            "application/json"
        );
        values.put(
            MediaStore.MediaColumns.RELATIVE_PATH,
            Environment.DIRECTORY_DOWNLOADS
        );
        values.put(
            MediaStore.MediaColumns.IS_PENDING,
            1
        );

        Uri uri = resolver.insert(
            MediaStore.Downloads.EXTERNAL_CONTENT_URI,
            values
        );

        if (uri == null) {
            throw new IllegalStateException(
                "Android ni ustvaril backup datoteke."
            );
        }

        boolean completed = false;

        try {
            writeBytes(resolver, uri, bytes);

            long verifiedBytes = countUriBytes(
                resolver,
                uri
            );

            if (verifiedBytes != bytes.length) {
                throw new IllegalStateException(
                    "Napacna velikost backupa. " +
                    "Pricakovano: " + bytes.length +
                    ", zapisano: " + verifiedBytes
                );
            }

            ContentValues publish = new ContentValues();
            publish.put(
                MediaStore.MediaColumns.IS_PENDING,
                0
            );

            int updated = resolver.update(
                uri,
                publish,
                null,
                null
            );

            if (updated <= 0) {
                throw new IllegalStateException(
                    "Backupa ni bilo mogoce objaviti v Download."
                );
            }

            completed = true;

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            result.put("bytes", verifiedBytes);
            result.put("filename", filename);
            result.put("location", "Download");
            return result;
        } finally {
            if (!completed) {
                resolver.delete(uri, null, null);
            }
        }
    }

    private JSObject saveLegacyDownload(
        String filename,
        byte[] bytes
    ) throws Exception {
        File downloads =
            Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS
            );

        if (
            !downloads.exists() &&
            !downloads.mkdirs()
        ) {
            throw new IllegalStateException(
                "Mape Download ni bilo mogoce ustvariti."
            );
        }

        File target = uniqueFile(
            downloads,
            filename
        );

        boolean completed = false;

        try (
            OutputStream output =
                new BufferedOutputStream(
                    new FileOutputStream(target)
                )
        ) {
            output.write(bytes);
            output.flush();
            completed = true;
        } finally {
            if (!completed && target.exists()) {
                target.delete();
            }
        }

        long verifiedBytes = countFileBytes(target);

        if (verifiedBytes != bytes.length) {
            target.delete();

            throw new IllegalStateException(
                "Napacna velikost backupa. " +
                "Pricakovano: " + bytes.length +
                ", zapisano: " + verifiedBytes
            );
        }

        JSObject result = new JSObject();
        result.put(
            "uri",
            Uri.fromFile(target).toString()
        );
        result.put("bytes", verifiedBytes);
        result.put("filename", target.getName());
        result.put("location", "Download");
        return result;
    }

    private void writeBytes(
        ContentResolver resolver,
        Uri uri,
        byte[] bytes
    ) throws Exception {
        OutputStream rawOutput =
            resolver.openOutputStream(uri, "w");

        if (rawOutput == null) {
            throw new IllegalStateException(
                "Ciljne datoteke ni bilo mogoce odpreti."
            );
        }

        try (
            OutputStream output =
                new BufferedOutputStream(rawOutput)
        ) {
            output.write(bytes);
            output.flush();
        }
    }

    private long countUriBytes(
        ContentResolver resolver,
        Uri uri
    ) throws Exception {
        InputStream rawInput =
            resolver.openInputStream(uri);

        if (rawInput == null) {
            throw new IllegalStateException(
                "Shranjene datoteke ni bilo mogoce preveriti."
            );
        }

        try (
            InputStream input =
                new BufferedInputStream(rawInput)
        ) {
            return countBytes(input);
        }
    }

    private long countFileBytes(File file) throws Exception {
        try (
            InputStream input =
                new BufferedInputStream(
                    new FileInputStream(file)
                )
        ) {
            return countBytes(input);
        }
    }

    private long countBytes(InputStream input) throws Exception {
        long total = 0;
        byte[] buffer = new byte[64 * 1024];
        int read;

        while ((read = input.read(buffer)) != -1) {
            total += read;
        }

        return total;
    }

    private String sanitizeFilename(String value) {
        String filename =
            value == null ? "" : value.trim();

        if (filename.isEmpty()) {
            filename = "workout-backup.json";
        }

        filename = filename.replaceAll(
            "[\\\\/:*?\"<>|]",
            "_"
        );

        if (!filename.toLowerCase().endsWith(".json")) {
            filename += ".json";
        }

        return filename;
    }

    private File uniqueFile(
        File directory,
        String filename
    ) {
        File candidate = new File(
            directory,
            filename
        );

        if (!candidate.exists()) {
            return candidate;
        }

        int dot = filename.lastIndexOf('.');
        String base =
            dot > 0 ? filename.substring(0, dot) : filename;
        String extension =
            dot > 0 ? filename.substring(dot) : "";

        int number = 1;

        while (candidate.exists()) {
            candidate = new File(
                directory,
                base + " (" + number + ")" + extension
            );
            number += 1;
        }

        return candidate;
    }
}
