import { useState, useRef } from "react";
import { X, Upload, ImagePlus, Image as ImageIcon, Trash2, CheckCircle, FolderOpen } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import "./UploadGalleryModal.css";

const UploadGalleryModal = ({ isOpen, onClose, session, onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle, uploading, cancelled, completed
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const cancelUploadRef = useRef(false); // Ref to track if upload has been cancelled while uploading

  // Accepted file types
  const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/heic"];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max per image for high resolution photos
  const MAX_TOTAL_SIZE = 300 * 1024 * 1024; // 300MB total for all files

  // Validate file
  const validateFile = (file) => {
    // checks if single file's MIME type against the allowed constraints and size is under limit
    if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
      return `${file.name}: Invalid file type. Only JPG, PNG, and HEIC are allowed.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large. Maximum size per image is 50MB.`;
    }
    return null;
  };

  // Handle file selection
  const handleFileSelect = (files) => {
    // normalizes the input into an array, validates and filters to image files, enforcin the total size limit, and generates previews for valid images
    const fileArray = Array.from(files);
    const errors = [];
    const validFiles = [];

    const imageFiles = fileArray.filter((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
        return false;
      }
      return true;
    });

    const currentTotalSize = selectedFiles.reduce(
      (sum, file) => sum + file.size,
      0,
    );
    const newTotalSize = imageFiles.reduce((sum, file) => sum + file.size, 0);

    if (currentTotalSize + newTotalSize > MAX_TOTAL_SIZE) {
      errors.push(
        `Total file size exceeds the 300MB limit. Please select fewer or smaller files.`,
      );
      return;
    }

    const MAX_PREVIEWS = 8; // Limit number of previews to prevent any performance issues. All files will still be uploaded, just without previews if over the limit.
    const filesToPreview = imageFiles.slice(0, MAX_PREVIEWS);
    const newPreviews = [];

    let loadedPreviews = 0;
    console.log(filesToPreview);
    filesToPreview.forEach((file) => {
      validFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push({
          file,
          preview: reader.result,
          name: file.name,
          size: file.size,
        });
        loadedPreviews++;
        if (loadedPreviews === filesToPreview.length) {
          setPreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    // add remaining files without previews if over limit
    if (imageFiles.length > MAX_PREVIEWS) {
      // changed to imageFiles.slice
      const filesWithoutPreview = imageFiles.files.slice(MAX_PREVIEWS);
      validFiles.push(...filesWithoutPreview);

      // add placeholder previews
      const placeholderPreviews = filesWithoutPreview.map((file) => ({
        file,
        preview: null, // no previews
        name: file.name,
        size: file.size,
      }));
      setPreviews((prev) => [...prev, ...placeholderPreviews]);
    }

    if (errors.length > 0) {
      setError(
        errors.slice(0, 10).join("\n") +
          (errors.length > 10
            ? `\n... and ${errors.length - 10} more errors`
            : ""),
      );
    } else {
      setError(null);
    }
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  // Handle drag and drop of single photos or folders
  const handleDrag = (e) => {
    // cancel's the browser's default handling of the file drop, stops bubbling, and toggles `dragActive` so the UI can visually highlight the drop zone only while items are over it
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    // On drop, disables the drag highlight and either recursively walks dropped directory entries (via `webkitGetAsEntry`) 
    // to collect files or falls back to direct file drops, then passes the resulting file list into `handleFileSelect`.
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const items = e.dataTransfer.items;
    const files = [];

    // Handle folders drop
    if (items) {
      const promises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          promises.push(traverseFileTree(item));
        }
      }

      Promise.all(promises).then(() => {
        if (files.length > 0) {
          handleFileSelect(files);
        }
      });
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // RECURSIVE function to traverse dropped folders and extract files
  const traverseFileTree = (item, files) => {
    // Recursively descends through a dropped directory tree, pushing each discovered File into the 
    // shared `files` array and resolving once all nested entries have been processed (file nodes resolve immediately; directory nodes resolve after all children resolve).
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file) => {
          files.push(file);
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries((entries) => {
          const promises = entries.map((entry) =>
            traverseFileTree(entry, files),
          );
          Promise.all(promises).then(resolve);
        });
      }
    });
  };

  // handle folder selection
  const handleFolderSelect = (e) => {
    // converts the folder input’s FileList into a normal array and reuses the same selection pipeline as individual-photo uploads by calling `handleFileSelect`.
    const files = Array.from(e.target.files);
    handleFileSelect(files);
  };

  // Remove file from selection
  const removeFile = (index) => {
    // removes the file and its corresponding preview at the same index from state so both arrays stay aligned and the UI updates immediately.
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    // converts a raw byte count into a friendly Bytes/KB/MB string by computing the appropriate power-of-1024 unit and rounding to two decimals for clean display.
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Handle upload
  const handleUpload = async () => {
    /* Orchestrates the full upload transaction: guards empty selection, authenticates and authorizes admin status, creates/loads the session’s Gallery row, 
    iterates selected files uploading each to Supabase Storage with retry + cancellation checks, then updates the Gallery with notification details and finally 
    triggers the success callback + resets modal state (or sets an error on failure)
    */
    setUploadStatus("uploading");
    cancelUploadRef.current = false; // Reset cancel flag at start of upload

    if (selectedFiles.length === 0) {
      setError("Please select at least one image to upload.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // 1) Get the current user (admin)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error("You must be logged in to upload galleries.");
      }

      // 2) Check if user is admin (adjusted with Erds 2/7/26)
      const { data: userRoleData, error: profileError } = await supabase
        .from("UserRole")
        .select("role_id")
        .eq("user_id", user.id)
        .single();

      const RoleId = userRoleData[0]?.role_id ?? null;
      const { data: roleData, error: roleError } = await supabase
        .from("Role")
        .select("id")
        .eq("name", "Admin")
        .single();

      const AdminId = roleData[0]?.id ?? null;

      if (profileError || AdminId !== RoleId) {
        throw new Error("Only admins can upload galleries.");
      }

      // 3) Create or get the gallery for this session
      let galleryId;

      // Check if gallery already exists for this session
      const { data: existingGallery, error: galleryFetchError } = await supabase
        .from("Gallery")
        .select("id")
        .eq("session_id", session.id)
        .single();

      if (galleryFetchError && galleryFetchError.code !== "PGRST116") {
        // PGRST116 means no rows returned, which is fine
        throw galleryFetchError;
      }

      if (existingGallery) {
        galleryId = existingGallery.id;
      } else {
        // Create new gallery
        const { data: newGallery, error: galleryCreateError } = await supabase
          .from("Gallery")
          .insert({
            session_id: session.id,
            title: `${session.clientName} - ${session.type}`,
            published_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        console.log("1) newGallery:", newGallery);
        if (galleryCreateError) throw galleryCreateError;
        galleryId = newGallery.id;
      }

      // 4) Upload each photo to Supabase Storage bucket with progress tracking
      const uploadedPhotos = [];
      const failedPhotos = [];
      const totalFiles = selectedFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        // cancel upload
        if (cancelUploadRef.current) {
          console.log("Upload cancelled by admin");
          setUploading(false);
          setCurrentFile(null);
          return;
        }
        const file = selectedFiles[i];
        setCurrentFile(file.name);

        try {
          // Generate unique filename
          const fileExt = file.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `galleries/${galleryId}/${fileName}`;

          // Upload to Supabase Storage Bucket
          const maxRetries = 3;
          let uploadSuccess = false;
          let uploadError = null;

          for (let retry = 0; retry < maxRetries && !uploadSuccess; retry++) {
            if (cancelUploadRef.current) {
              console.log("Upload cancelled during retry");
              setUploading(false);
              setCurrentFile(null);
              return;
            }
            console.log("filepath:", filePath);
            console.log("file:", file);

            const { data: uploadData, error: uploadError } =
              await supabase.storage.from("photos").upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
              });
            // console.log(uploadData);
            if (!uploadError) {
              uploadSuccess = true;

              // get image dimension if possible
              let width = null;
              let height = null;

              if (previews[i].preview) {
                try {
                  const img = new Image();
                  img.src = previews[i].preview;
                  await new Promise((resolve) => {
                    img.onload = () => {
                      width = img.width;
                      height = img.height;
                      resolve();
                    };
                    img.onerror = resolve; // resolve even if image fails to load to prevent blocking
                  });
                } catch (err) {
                  console.warn(
                    `Could not get dimensions for ${file.name}:`,
                    err,
                  );
                }
              }
              // if (!photoError) {
              //   uploadedPhotos.push(uploadData);
              // } else {
              //   console.error(
              //     `Error creating Photo record for ${file.name}:`,
              //     photoError,
              //   );
              //   failedPhotos.push(file.name);
              // }
            } else {
              if (retry < maxRetries - 1) {
                // wait before retrying
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * Math.pow(2, retry)),
                );
              }
            }
          }
          if (!uploadSuccess) {
            console.error(
              ~`Failed to upload ${file.name} after ${maxRetries} attempts:`,
              uploadError,
            );
            failedPhotos.push(file.name);
          } else {
            uploadedPhotos.push(file.name);
          }
        } catch (err) {
          console.error("Error processing:", err);
          failedPhotos.push(file.name);
        }
        // if (uploadedPhotos.length === 0) {
        //   throw new Error("Failed to upload any photos. Please try again.");
        // }

        
      }
      // 5) Update gallery with notification info
        const { data: sessionData } = await supabase
          .from("Session")
          .select("User(email)")
          .eq("id", session.id)
          .single();

        if (sessionData?.User?.email) {
          await supabase
            .from("Gallery")
            .update({
              published_email: sessionData.User.email,
              published_link: `${window.location.origin}/client/galleries/${galleryId}`,
            })
            .eq("id", galleryId);
        }
      // Success!
      setTimeout(() => {
        // Upload finished successfully
        setUploadStatus("completed");
        setUploading(false);
        setCurrentFile(null);
        setUploadProgress(100);
        
        onUploadSuccess({
          galleryId,
          photoCount: uploadedPhotos.length,
          failedCount: failedPhotos.length,
          clientEmail: sessionData?.User?.email,
        });
        handleCloseModal();
        if (failedPhotos.length > 0) {
          console.warn("Failed photos:", failedPhotos);
        }
      }, 1000);
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err.message || "An error occurred during upload. Please try again.",
      );
      setUploading(false);
      setCurrentFile(null);
    }
  };

  // Handle upload cancellation
  const handleCancelUpload = () => {
    // If an upload is currently running, flips a ref-based cancel flag that the upload loops check between attempts, 
    // updates UI state to “cancelled,” and clears per-file indicators so the modal reflects an immediate stop.
    // Set cancel flag to true to stop upload if in progress
    if (uploadStatus === "uploading") {
      cancelUploadRef.current = true;
      setUploadStatus("cancelled");
      setUploading(false);
      setCurrentFile(null);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    // Resets all modal-local state back to the initial “idle” selection state (including clearing cancellation), 
    // then calls the parent `onClose` so the modal unmounts cleanly with no leftover selection/upload UI.
    cancelUploadRef.current = false; // Reset cancel flag when closing modal
    setSelectedFiles([]);
    setPreviews([]);
    setError(null);
    setUploadProgress(0);
    setUploadStatus("idle");
    onClose();
  };

  if (!isOpen) return null;

  // Computes the combined size of all currently-selected files and the percentage of the 300MB cap so the UI can show the fill bar + warning threshold.
  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const sizePercentage = (totalSize / MAX_TOTAL_SIZE) * 100;

  return (
    <div className="modal-overlay" onClick={handleCloseModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Upload Gallery</h2>
            <p className="modal-subtitle">
              {session.clientName} - {session.type} ({session.date})
            </p>
          </div>
          <button
            className="modal-close-button"
            onClick={handleCloseModal}
            disabled={uploading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Info Message */}
          <div className="info-message">
            <p>Client will be automatically notified once upload is complete</p>
          </div>
          {/* Upload Options */}
          <div className="upload-options">
            <button
              className="upload-option-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <ImagePlus size={24} />
              <span>Select Individual Photos</span>
            </button>
            <button
              className="upload-option-btn upload-option-btn--primary"
              onClick={() => folderInputRef.current?.click()}
              disabled={uploading}
            >
              <FolderOpen size={24} />
              <span>Select Folder</span>
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <div
            className={`upload-zone ${dragActive ? "upload-zone--active" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload size={48} className="upload-icon" />
            <p className="upload-text">Or drag and drop images here</p>
            <p className="upload-subtext">
              Accepted formats: JPG, PNG, HEIC (Max 50MB each)
            </p>
            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.heic"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="file-input-hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handleFolderSelect}
              className="file-input-hidden"
            />
          </div>
          {/* Size Indicator */}
          {selectedFiles.length > 0 && (
            <div className="size-indicator">
              <div className="size-indicator-bar">
                <div
                  className={`size-indicator-fill ${sizePercentage > 90 ? "size-indicator-fill--warning" : ""}`}
                  style={{ width: `${Math.min(sizePercentage, 100)}%` }}
                />
              </div>
              <p className="size-indicator-text">
                {formatFileSize(totalSize)} / {formatFileSize(MAX_TOTAL_SIZE)} (
                {sizePercentage.toFixed(1)}%)
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* Selected Files Preview */}
          {previews.length > 0 && (
            <div className="preview-section">
              <div className="preview-header">
                <h3>Selected Images ({selectedFiles.length})</h3>
                <p className="preview-total-size">
                  Total: {formatFileSize(totalSize)}
                </p>
              </div>
              <div className="preview-grid">
                {previews.slice(0, 20).map((preview, index) => (
                  <div key={index} className="preview-item">
                    <div className="preview-image-container">
                      {preview.preview ? (
                        <img
                          src={preview.preview}
                          alt={preview.name}
                          className="preview-image"
                        />
                      ) : (
                        <div className="preview-placeholder">
                          <ImageIcon size={32} />
                        </div>
                      )}
                      {!uploading && (
                        <button
                          className="preview-remove-btn"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div className="preview-info">
                      <p className="preview-filename">{preview.name}</p>
                      <p className="preview-filesize">
                        {formatFileSize(preview.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {previews.length > 20 && (
                <p className="preview-more">
                  ...and {previews.length - 20} more images
                </p>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {uploadStatus === "uploading" && (
            <div className="upload-progress">
              <p className="upload-current-file">Uploading: {currentFile}</p>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="progress-text">
                {uploadProgress}% Complete (
                {Math.floor((uploadProgress / 100) * selectedFiles.length)} of{" "}
                {selectedFiles.length} files )
              </p>
            </div>
          )}

          {/* Cancelled Message */}
          {uploadStatus === "cancelled" && (
            <div className="cancelled-message">
              <p>Upload cancelled. No files were uploaded.</p>
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === "completed" && (
            <div className="success-message">
              <CheckCircle size={20} />
              <span>
                Gallery uploaded successfully! Notification sent to{" "}
                {session.clientName}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleCancelUpload}>
            {uploading ? "Cancel Upload" : "Cancel"}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading
              ? `Uploading... ${uploadProgress}%`
              : `Upload ${selectedFiles.length} Image${selectedFiles.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadGalleryModal;
