from pathlib import Path
import mimetypes

from django.http import FileResponse, Http404


SAFE_INLINE_IMAGE_TYPES = {
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
}


def private_file_response(field_file, *, inline_image=False):
    """Stream an already-authorized stored file with conservative headers."""
    if not field_file or not field_file.name:
        raise Http404

    filename = Path(field_file.name).name
    guessed_type, _ = mimetypes.guess_type(filename)
    content_type = (
        guessed_type
        if inline_image and guessed_type in SAFE_INLINE_IMAGE_TYPES
        else 'application/octet-stream'
    )
    try:
        handle = field_file.open('rb')
    except (FileNotFoundError, OSError, ValueError) as exc:
        raise Http404 from exc

    response = FileResponse(
        handle,
        as_attachment=content_type == 'application/octet-stream',
        filename=filename,
        content_type=content_type,
    )
    response['Cache-Control'] = 'private, no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    return response
