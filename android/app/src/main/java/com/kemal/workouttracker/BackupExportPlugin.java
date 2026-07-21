package com.kemal.workouttracker;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
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

    private File pendingBackupFile;
    private long pendingBackupBytes;

    @PluginMethod
    public void saveJson(PluginCall call) {
        String content = call.getString("content");
        String filename = call.getString(
            "filename",
            "workout-backup.json"
        );

        if (content == null || content.isEmpty()) {
            call.reject("Backup content is empty.");
            return;
        }

        if (pendingBackupFile != null) {
            call.reject("Drug backup se ze shranjuje.");
            return;
        }

        File temporaryFile = null;

        try {
            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);

            if (bytes.length == 0) {
                call.reject("Backup ima 0 bajtov.");
                return;
            }

            temporaryFile = File.createTempFile(
                "workout-backup-",
                ".json",
                getContext().getCacheDir()
            );

            try (
                FileOutputStream output =
                    new FileOutputStream(temporaryFile)
            ) {
                output.write(bytes);
                output.flush();
                output.getFD().sync();
            }

            long temporaryLength = temporaryFile.length();

            if (temporaryLength != bytes.length) {
                throw new IllegalStateException(
                    "Zacasni backup ni bil v celoti zapisan. " +
                    "Pricakovano: " + bytes.length +
                    ", zapisano: " + temporaryLength
                );
            }

            pendingBackupFile = temporaryFile;
            pendingBackupBytes = temporaryLength;

            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

            startActivityForResult(
                call,
                intent,
                "saveJsonResult"
            );
        } catch (Exception error) {
            if (temporaryFile != null) {
                temporaryFile.delete();
            }

            clearPendingBackup();

            call.reject(
                "Backupa ni bilo mogoce pripraviti.",
                null,
                error
            );
        }
    }

    @ActivityCallback
    private void saveJsonResult(
        PluginCall call,
        ActivityResult activityResult
    ) {
        File sourceFile = pendingBackupFile;
        long expectedBytes = pendingBackupBytes;

        clearPendingBackup();

        if (call == null) {
            deleteQuietly(sourceFile);
            return;
        }

        Intent data = activityResult.getData();

        if (
            activityResult.getResultCode() != Activity.RESULT_OK ||
            data == null ||
            data.getData() == null
        ) {
            deleteQuietly(sourceFile);
            call.reject("Shranjevanje backupa je bilo preklicano.");
            return;
        }

        if (
            sourceFile == null ||
            !sourceFile.exists() ||
            sourceFile.length() <= 0
        ) {
            deleteQuietly(sourceFile);
            call.reject("Zacasni backup manjka ali je prazen.");
            return;
        }

        Uri uri = data.getData();

        try {
            long copiedBytes = copyToDocument(sourceFile, uri);

            if (
                copiedBytes <= 0 ||
                copiedBytes != expectedBytes
            ) {
                throw new IllegalStateException(
                    "Backup ni bil v celoti prekopiran. " +
                    "Pricakovano: " + expectedBytes +
                    ", kopirano: " + copiedBytes
                );
            }

            long verifiedBytes = countDocumentBytes(uri);

            if (
                verifiedBytes <= 0 ||
                verifiedBytes != expectedBytes
            ) {
                throw new IllegalStateException(
                    "Preverjanje shranjene datoteke ni uspelo. " +
                    "Pricakovano: " + expectedBytes +
                    ", prebrano: " + verifiedBytes
                );
            }

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            result.put("bytes", verifiedBytes);
            call.resolve(result);
        } catch (Exception error) {
            call.reject(
                "Backup datoteka ni bila pravilno zapisana.",
                null,
                error
            );
        } finally {
            deleteQuietly(sourceFile);
        }
    }

    private long copyToDocument(
        File sourceFile,
        Uri destinationUri
    ) throws Exception {
        OutputStream rawOutput = null;

        try {
            rawOutput =
                getContext()
                    .getContentResolver()
                    .openOutputStream(destinationUri, "rwt");
        } catch (Exception ignored) {
            // Nekateri ponudniki dokumentov ne podpirajo "rwt".
        }

        if (rawOutput == null) {
            rawOutput =
                getContext()
                    .getContentResolver()
                    .openOutputStream(destinationUri);
        }

        if (rawOutput == null) {
            throw new IllegalStateException(
                "Ciljne datoteke ni bilo mogoce odpreti."
            );
        }

        long total = 0;
        byte[] buffer = new byte[64 * 1024];

        try (
            InputStream input =
                new BufferedInputStream(
                    new FileInputStream(sourceFile)
                );
            OutputStream output =
                new BufferedOutputStream(rawOutput)
        ) {
            int read;

            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                total += read;
            }

            output.flush();
        }

        return total;
    }

    private long countDocumentBytes(Uri uri) throws Exception {
        InputStream rawInput =
            getContext()
                .getContentResolver()
                .openInputStream(uri);

        if (rawInput == null) {
            throw new IllegalStateException(
                "Shranjene datoteke ni bilo mogoce preveriti."
            );
        }

        long total = 0;
        byte[] buffer = new byte[64 * 1024];

        try (
            InputStream input =
                new BufferedInputStream(rawInput)
        ) {
            int read;

            while ((read = input.read(buffer)) != -1) {
                total += read;
            }
        }

        return total;
    }

    private void clearPendingBackup() {
        pendingBackupFile = null;
        pendingBackupBytes = 0;
    }

    private void deleteQuietly(File file) {
        if (file != null && file.exists()) {
            file.delete();
        }
    }
}
