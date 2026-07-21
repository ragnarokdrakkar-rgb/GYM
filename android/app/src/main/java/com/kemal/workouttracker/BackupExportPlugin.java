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

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "BackupExport")
public class BackupExportPlugin extends Plugin {

    @PluginMethod
    public void saveJson(PluginCall call) {
        String content = call.getString("content");
        String filename = call.getString(
            "filename",
            "workout-backup.json"
        );

        if (content == null) {
            call.reject("Backup content is missing.");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

        startActivityForResult(
            call,
            intent,
            "saveJsonResult"
        );
    }

    @ActivityCallback
    private void saveJsonResult(
        PluginCall call,
        ActivityResult activityResult
    ) {
        if (call == null) {
            return;
        }

        Intent data = activityResult.getData();

        if (
            activityResult.getResultCode() != Activity.RESULT_OK ||
            data == null ||
            data.getData() == null
        ) {
            call.reject(
                "Shranjevanje backupa je bilo preklicano."
            );
            return;
        }

        Uri uri = data.getData();
        String content = call.getString("content");

        try (
            OutputStream output =
                getContext()
                    .getContentResolver()
                    .openOutputStream(uri, "w")
        ) {
            if (output == null) {
                throw new IllegalStateException(
                    "Output stream ni na voljo."
                );
            }

            output.write(
                content.getBytes(StandardCharsets.UTF_8)
            );
            output.flush();

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            call.resolve(result);
        } catch (Exception error) {
            call.reject(
                "Backupa ni bilo mogoce shraniti.",
                null,
                error
            );
        }
    }
}
