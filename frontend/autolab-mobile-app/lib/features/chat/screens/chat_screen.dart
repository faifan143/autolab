import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:provider/provider.dart';

import '../../../core/models/chat_message_model.dart';
import '../../../core/models/file_model.dart';
import '../../../core/providers/chat_provider.dart';
import '../../../core/services/files_service.dart';

class ChatScreen extends StatefulWidget {
  final String channel;
  final String? labId;
  final String? title;

  const ChatScreen({
    super.key,
    required this.channel,
    this.labId,
    this.title,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final FilesService _filesService = FilesService();
  late final ChatProvider _chatProvider;
  final List<FileModel> _pendingAttachments = [];
  bool _isUploadingAttachment = false;

  @override
  void initState() {
    super.initState();
    _chatProvider = Provider.of<ChatProvider>(context, listen: false);
    Future.microtask(() {
      _chatProvider.init(channel: widget.channel, labId: widget.labId);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _chatProvider.leave();
    super.dispose();
  }

  String get _screenTitle {
    if (widget.title != null && widget.title!.isNotEmpty) {
      return widget.title!;
    }
    if (widget.channel == 'teachers:lobby') {
      return 'teachers.lobby'.tr;
    }
    return 'chat.title'.tr;
  }

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<ChatProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(_screenTitle),
      ),
      body: Column(
        children: [
          Expanded(
            child: Builder(
              builder: (context) {
                if (chat.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (chat.error != null && chat.messages.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        'chat.error'.tr,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  );
                }
                if (chat.messages.isEmpty) {
                  return Center(
                    child: Text('chat.empty'.tr),
                  );
                }
                return _MessagesList(messages: chat.messages);
              },
            ),
          ),
          const Divider(height: 1),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_pendingAttachments.isNotEmpty)
                    SizedBox(
                      height: 64,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _pendingAttachments.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final file = _pendingAttachments[index];
                          return InputChip(
                            label: Text(
                              file.fileName,
                              overflow: TextOverflow.ellipsis,
                            ),
                            onPressed: () => _openAttachment(file),
                            onDeleted: chat.isSending
                                ? null
                                : () {
                                    setState(() {
                                      _pendingAttachments.removeAt(index);
                                    });
                                  },
                          );
                        },
                      ),
                    ),
                  Row(
                    children: [
                      IconButton(
                        tooltip: 'Attach file',
                        onPressed: (chat.isSending || _isUploadingAttachment)
                            ? null
                            : _pickAndAttachFile,
                        icon: _isUploadingAttachment
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.attach_file),
                      ),
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          minLines: 1,
                          maxLines: 4,
                          enabled: !chat.isSending,
                          decoration: InputDecoration(
                            hintText: 'chat.input.hint'.tr,
                            border: const OutlineInputBorder(),
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                          ),
                          onSubmitted: chat.isSending ? null : (_) => _send(chat),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: chat.isSending
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.send),
                        color: Theme.of(context).colorScheme.primary,
                        onPressed: chat.isSending ? null : () => _send(chat),
                        tooltip: 'chat.send'.tr,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _send(ChatProvider chat) async {
    final text = _controller.text.trim();
    if (text.isEmpty && _pendingAttachments.isEmpty) return;
    await chat.sendMessageWithAttachments(
      text,
      attachmentFileIds: _pendingAttachments.map((e) => e.id).toList(),
    );
    if (mounted) {
      _controller.clear();
      setState(() {
        _pendingAttachments.clear();
      });
    }
  }

  Future<void> _pickAndAttachFile() async {
    final selected = await FilePicker.platform.pickFiles(withReadStream: false);
    if (selected == null || selected.files.isEmpty) return;
    final path = selected.files.first.path;
    if (path == null || widget.labId == null || widget.labId!.isEmpty) return;

    setState(() {
      _isUploadingAttachment = true;
    });
    try {
      final uploaded = await _filesService.uploadFile(path, labId: widget.labId);
      if (!mounted) return;
      setState(() {
        _pendingAttachments.add(uploaded);
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to attach file')),
      );
    } finally {
      if (!mounted) return;
      setState(() {
        _isUploadingAttachment = false;
      });
    }
  }

  Future<void> _openAttachment(FileModel file) async {
    try {
      final downloaded = await _filesService.downloadToDevice(
        file.id,
        file.fileName,
        mimeType: file.mimeType,
      );
      if (!mounted) return;
      if (FilesService.isImageFile(file.mimeType) ||
          FilesService.isImageFileByName(file.fileName)) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            fullscreenDialog: true,
            builder: (_) => Scaffold(
              appBar: AppBar(title: Text(file.fileName)),
              body: InteractiveViewer(child: Image.file(downloaded)),
            ),
          ),
        );
        return;
      }
      await OpenFilex.open(downloaded.path);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to open attachment')),
      );
    }
  }
}

class _MessagesList extends StatelessWidget {
  final List<ChatMessageModel> messages;

  const _MessagesList({required this.messages});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    final formatter = DateFormat('HH:mm');

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      reverse: true,
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final message = messages[messages.length - 1 - index];
        final time = formatter.format(message.createdAt.toLocal());
        final senderName = message.sender?.name ?? '—';

        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: color.primary.withOpacity(0.15),
                child: Text(
                  senderName.isNotEmpty
                      ? senderName[0].toUpperCase()
                      : '?',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: color.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              senderName,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            time,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: color.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      if (message.content.isNotEmpty)
                        Text(
                          message.content,
                          style: theme.textTheme.bodyMedium,
                        ),
                      if (message.files.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: message.files
                              .map(
                                (file) => ActionChip(
                                  avatar: const Icon(Icons.attach_file, size: 18),
                                  label: Text(
                                    file.fileName,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  onPressed: () async {
                                    try {
                                      final filesService = FilesService();
                                      final downloaded =
                                          await filesService.downloadToDevice(
                                        file.id,
                                        file.fileName,
                                        mimeType: file.mimeType,
                                      );
                                      if (!context.mounted) return;
                                      final isImage =
                                          FilesService.isImageFile(file.mimeType) ||
                                              FilesService.isImageFileByName(
                                                file.fileName,
                                              );
                                      if (isImage) {
                                        await Navigator.of(context).push(
                                          MaterialPageRoute<void>(
                                            fullscreenDialog: true,
                                            builder: (_) => Scaffold(
                                              appBar: AppBar(
                                                title: Text(file.fileName),
                                              ),
                                              body: InteractiveViewer(
                                                child: Image.file(downloaded),
                                              ),
                                            ),
                                          ),
                                        );
                                      } else {
                                        await OpenFilex.open(downloaded.path);
                                      }
                                    } catch (_) {
                                      if (!context.mounted) return;
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Failed to open file'),
                                        ),
                                      );
                                    }
                                  },
                                ),
                              )
                              .toList(),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
